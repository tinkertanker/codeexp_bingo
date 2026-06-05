import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { assertEligible } from './eligibility'
import { effectiveCategory, isSquareClosed, isSquareReleased } from './lib'

const APPROACH_LIMIT_PER_TEAM = 10

async function deleteExistingPhotos(
  ctx: MutationCtx,
  completionId: Id<'squareCompletions'>,
): Promise<void> {
  const photos = await ctx.db.query('photos').collect()
  for (const p of photos) {
    if (p.completionId === completionId) {
      await ctx.storage.delete(p.storageId)
      await ctx.db.delete(p._id)
    }
  }
}

async function findExisting(
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  squareId: Id<'bingoSquares'>,
): Promise<Doc<'squareCompletions'> | null> {
  return await ctx.db
    .query('squareCompletions')
    .withIndex('by_team_and_square', (q) => q.eq('teamId', teamId).eq('squareId', squareId))
    .unique()
}

async function upsert(
  ctx: MutationCtx,
  payload: Omit<Doc<'squareCompletions'>, '_id' | '_creationTime'>,
): Promise<Id<'squareCompletions'>> {
  const existing = await findExisting(ctx, payload.teamId, payload.squareId)
  if (existing) {
    await ctx.db.replace(existing._id, payload)
    return existing._id
  }
  return await ctx.db.insert('squareCompletions', payload)
}

async function assertScannedTeamApproachLimit(
  ctx: MutationCtx,
  scannedTeamId: Id<'teams'>,
  squareCategory: 'orange' | 'blue' | 'grey' | 'wild',
  excludeCompletionId?: Id<'squareCompletions'>,
): Promise<void> {
  const completions = await ctx.db
    .query('squareCompletions')
    .withIndex('by_scanned_team_id', (q) => q.eq('scannedTeamId', scannedTeamId))
    .filter((q) => q.neq(q.field('status'), 'rejected'))
    .collect()

  let counted = 0
  for (const completion of completions) {
    if (completion._id === excludeCompletionId) continue
    const sq = await ctx.db.get(completion.squareId)
    if (!sq || sq.category !== squareCategory) continue
    counted++
    if (counted >= APPROACH_LIMIT_PER_TEAM) {
      const scannedTeam = await ctx.db.get(scannedTeamId)
      const label = squareCategory === 'orange' ? 'red' : squareCategory
      throw new Error(
        `"${scannedTeam?.name ?? 'This team'}" has been approached the maximum ${APPROACH_LIMIT_PER_TEAM} times for ${label} squares already. Try finding a different team to scan!`,
      )
    }
  }
}

// (3) Blue squares: each scan must be a different *team* AND a different team *colour*.
async function checkBlueDistinctTeamRule(
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  squareId: Id<'bingoSquares'>,
  scannedTeamId: Id<'teams'>,
): Promise<void> {
  const otherBlueSquares = (await ctx.db.query('bingoSquares').collect())
    .filter((s) => s.enforceColourDistinct && s._id !== squareId)
  if (otherBlueSquares.length === 0) return

  const otherIds = new Set(otherBlueSquares.map((s) => s._id))
  const myCompletions = await ctx.db
    .query('squareCompletions')
    .withIndex('by_team', (q) => q.eq('teamId', teamId))
    .collect()

  const scannedTeam = await ctx.db.get(scannedTeamId)

  // Check same-team reuse
  const teamConflict = myCompletions.find(
    (c) =>
      otherIds.has(c.squareId) &&
      c.scannedTeamId === scannedTeamId &&
      c.status !== 'rejected',
  )
  if (teamConflict) {
    throw new Error(
      `You've already scanned ${scannedTeam?.name ?? 'this team'} for another blue square. Each blue square needs a different team.`,
    )
  }

  // Check same-colour reuse — all 5 blue squares must use a different colour.
  if (scannedTeam) {
    const TOTAL_COLOURS = 5
    const ALL_COLOURS: string[] = ['red', 'blue', 'green', 'yellow', 'purple']
    const COLOUR_DISPLAY: Record<string, string> = {
      red: 'Magenta', blue: 'Cyan', green: 'Lime', yellow: 'Yellow', purple: 'Purple',
    }
    const usedColours = new Set<string>()
    for (const c of myCompletions) {
      if (!otherIds.has(c.squareId) || c.status === 'rejected' || !c.scannedTeamId) continue
      const otherTeam = await ctx.db.get(c.scannedTeamId)
      if (otherTeam) usedColours.add(otherTeam.colour)
    }
    if (usedColours.size < TOTAL_COLOURS && usedColours.has(scannedTeam.colour)) {
      const usedNames = [...usedColours].map((c) => COLOUR_DISPLAY[c] ?? c).join(', ')
      const remainingNames = ALL_COLOURS.filter((c) => !usedColours.has(c)).map((c) => COLOUR_DISPLAY[c] ?? c).join(', ')
      throw new Error(
        `You've already scanned a ${COLOUR_DISPLAY[scannedTeam.colour] ?? scannedTeam.colour} team. Colours used so far: ${usedNames}. You still need: ${remainingNames}.`,
      )
    }
  }
}

async function assertGameOpen(ctx: MutationCtx): Promise<void> {
  const game = await ctx.db.query('gameState').first()
  if (!game?.isOpen) {
    throw new Error('The bingo is paused — submissions are locked right now.')
  }
}

// (4b + 5) Shared gate every submission goes through after game-open: enforces release time
// and the cat1/cat2 restriction.
async function assertCanSubmit(
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  squareId: Id<'bingoSquares'>,
): Promise<Doc<'bingoSquares'>> {
  await assertGameOpen(ctx)
  const square = await ctx.db.get(squareId)
  if (!square) throw new Error('Square not found.')
  if (isSquareClosed(square)) {
    throw new Error('This task is closed — it has expired and can no longer be completed.')
  }
  if (!isSquareReleased(square)) {
    throw new Error("This square isn't unlocked yet. Check back later.")
  }
  if (square.restrictToCategory) {
    const team = await ctx.db.get(teamId)
    if (!team) throw new Error('Team not found.')
    if (effectiveCategory(team) !== square.restrictToCategory) {
      throw new Error("This square isn't part of your category.")
    }
  }
  return square
}

export const listForTeam = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx: QueryCtx, { teamId }) => {
    return await ctx.db
      .query('squareCompletions')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect()
  },
})

export const submitScanTeam = mutation({
  args: {
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
    scannedTeamId: v.id('teams'),
  },
  handler: async (ctx: MutationCtx, args) => {
    const square = await assertCanSubmit(ctx, args.teamId, args.squareId)
    // (4a) Orange squares: the scanned team must have an approved self-declaration.
    // Self-scan is allowed — teams that implemented the feature in their own app can
    // scan their own QR to earn the square, as long as their eligibility is approved.
    if (square.category === 'orange') {
      await assertEligible(ctx, args.scannedTeamId, args.squareId)
    }
    const existing = await findExisting(ctx, args.teamId, args.squareId)
    await assertScannedTeamApproachLimit(ctx, args.scannedTeamId, square.category, existing?._id)
    await upsert(ctx, {
      teamId: args.teamId,
      squareId: args.squareId,
      scannedTeamId: args.scannedTeamId,
      status: 'approved',
    })
  },
})

export const submitScanTeamWithAnswer = mutation({
  args: {
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
    scannedTeamId: v.id('teams'),
    textAnswer: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const square = await assertCanSubmit(ctx, args.teamId, args.squareId)
    if (args.scannedTeamId === args.teamId) {
      throw new Error("Blue squares need to be completed with another team — you can't scan yourself here.")
    }
    if (!args.textAnswer.trim()) {
      throw new Error("Please type the team's answer briefly.")
    }
    if (square.enforceColourDistinct) {
      await checkBlueDistinctTeamRule(ctx, args.teamId, args.squareId, args.scannedTeamId)
    }
    const existing = await findExisting(ctx, args.teamId, args.squareId)
    await assertScannedTeamApproachLimit(ctx, args.scannedTeamId, square.category, existing?._id)
    await upsert(ctx, {
      teamId: args.teamId,
      squareId: args.squareId,
      scannedTeamId: args.scannedTeamId,
      textAnswer: args.textAnswer.trim().slice(0, 280),
      status: 'approved',
    })
  },
})

export const submitPhotoWithTeam = mutation({
  args: {
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
    scannedTeamId: v.id('teams'),
    photoStorageId: v.id('_storage'),
  },
  handler: async (ctx: MutationCtx, args) => {
    const square = await assertCanSubmit(ctx, args.teamId, args.squareId)
    if (args.scannedTeamId === args.teamId) {
      throw new Error("This square needs a photo with another team — you can't scan yourself here.")
    }
    const existing = await findExisting(ctx, args.teamId, args.squareId)
    await assertScannedTeamApproachLimit(ctx, args.scannedTeamId, square.category, existing?._id)
    if (existing) await deleteExistingPhotos(ctx, existing._id)
    const id = await upsert(ctx, {
      teamId: args.teamId,
      squareId: args.squareId,
      scannedTeamId: args.scannedTeamId,
      photoStorageId: args.photoStorageId,
      status: 'approved',
    })
    await ctx.db.insert('photos', {
      teamId: args.teamId,
      completionId: id,
      storageId: args.photoStorageId,
    })
  },
})

export const submitPhotoAuto = mutation({
  args: {
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
    photoStorageId: v.id('_storage'),
  },
  handler: async (ctx: MutationCtx, args) => {
    await assertCanSubmit(ctx, args.teamId, args.squareId)
    const existing = await findExisting(ctx, args.teamId, args.squareId)
    if (existing) await deleteExistingPhotos(ctx, existing._id)
    const id = await upsert(ctx, {
      teamId: args.teamId,
      squareId: args.squareId,
      photoStorageId: args.photoStorageId,
      status: 'approved',
    })
    await ctx.db.insert('photos', {
      teamId: args.teamId,
      completionId: id,
      storageId: args.photoStorageId,
    })
  },
})

export const submitPhotoMentor = mutation({
  args: {
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
    photoStorageId: v.id('_storage'),
  },
  handler: async (ctx: MutationCtx, args) => {
    await assertCanSubmit(ctx, args.teamId, args.squareId)
    const existing = await findExisting(ctx, args.teamId, args.squareId)
    if (existing) await deleteExistingPhotos(ctx, existing._id)
    const id = await upsert(ctx, {
      teamId: args.teamId,
      squareId: args.squareId,
      photoStorageId: args.photoStorageId,
      status: 'pending',
    })
    await ctx.db.insert('photos', {
      teamId: args.teamId,
      completionId: id,
      storageId: args.photoStorageId,
    })
  },
})

export const submitIgUrl = mutation({
  args: {
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
    igUrl: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    await assertCanSubmit(ctx, args.teamId, args.squareId)
    const trimmed = args.igUrl.trim()
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new Error('Please paste a full URL starting with https://')
    }
    await upsert(ctx, {
      teamId: args.teamId,
      squareId: args.squareId,
      igUrl: trimmed,
      status: 'pending',
    })
  },
})

export const submitBoothQr = mutation({
  args: {
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
  },
  handler: async (ctx: MutationCtx, args) => {
    await assertCanSubmit(ctx, args.teamId, args.squareId)
    await upsert(ctx, {
      teamId: args.teamId,
      squareId: args.squareId,
      status: 'approved',
    })
  },
})

export const submitClaimQr = mutation({
  args: {
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
  },
  handler: async (ctx: MutationCtx, args) => {
    await assertCanSubmit(ctx, args.teamId, args.squareId)
    await upsert(ctx, {
      teamId: args.teamId,
      squareId: args.squareId,
      status: 'approved',
    })
  },
})

export const listApprovedPhotos = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const approved = await ctx.db
      .query('squareCompletions')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .collect()
    const withPhotos = approved.filter((c) => c.photoStorageId)
    return await Promise.all(
      withPhotos.map(async (c) => {
        const team = await ctx.db.get(c.teamId)
        const square = await ctx.db.get(c.squareId)
        const photoUrl = c.photoStorageId ? await ctx.storage.getUrl(c.photoStorageId) : null
        return { completion: c, team, square, photoUrl }
      }),
    )
  },
})

export const listPending = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const pending = await ctx.db
      .query('squareCompletions')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect()
    pending.sort((a, b) => a._creationTime - b._creationTime)
    return await Promise.all(
      pending.map(async (c) => {
        const team = await ctx.db.get(c.teamId)
        const square = await ctx.db.get(c.squareId)
        const photoUrl = c.photoStorageId ? await ctx.storage.getUrl(c.photoStorageId) : null
        return { completion: c, team, square, photoUrl }
      }),
    )
  },
})
