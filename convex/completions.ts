import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'

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

async function checkBlueColourRule(
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
  const otherBlueCompletions = myCompletions.filter(
    (c) => otherIds.has(c.squareId) && c.scannedTeamId && c.status !== 'rejected',
  )
  if (otherBlueCompletions.length === 0) return

  const scannedTeam = await ctx.db.get(scannedTeamId)
  if (!scannedTeam) return
  for (const c of otherBlueCompletions) {
    const t = await ctx.db.get(c.scannedTeamId!)
    if (t && t.colour === scannedTeam.colour) {
      throw new Error(
        `You've already used a ${scannedTeam.colour} team for another blue square. Each blue square needs a different team-colour.`,
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
    await assertGameOpen(ctx)
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
    await assertGameOpen(ctx)
    if (args.scannedTeamId === args.teamId) {
      throw new Error("Blue squares need to be completed with another team — you can't scan yourself here.")
    }
    if (!args.textAnswer.trim()) {
      throw new Error("Please type the team's answer briefly.")
    }
    const square = await ctx.db.get(args.squareId)
    if (!square) throw new Error('Square not found.')
    if (square.enforceColourDistinct) {
      await checkBlueColourRule(ctx, args.teamId, args.squareId, args.scannedTeamId)
    }
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
    await assertGameOpen(ctx)
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
    await assertGameOpen(ctx)
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
    await assertGameOpen(ctx)
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
    await assertGameOpen(ctx)
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
    await assertGameOpen(ctx)
    await upsert(ctx, {
      teamId: args.teamId,
      squareId: args.squareId,
      status: 'approved',
    })
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
