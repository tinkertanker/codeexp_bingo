import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { assertAdmin } from './admin'
import { isSquareClosed, isSquareReleased } from './lib'
import { logMentorAction } from './mentorActions'

// (4a) Self-declared eligibility for orange "find a team that did X" squares.

async function findExisting(
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  squareId: Id<'bingoSquares'>,
): Promise<Doc<'teamEligibility'> | null> {
  return await ctx.db
    .query('teamEligibility')
    .withIndex('by_team_and_square', (q) => q.eq('teamId', teamId).eq('squareId', squareId))
    .unique()
}

export const listForTeam = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx: QueryCtx, { teamId }) => {
    return await ctx.db
      .query('teamEligibility')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect()
  },
})

export const declare = mutation({
  args: { teamId: v.id('teams'), squareId: v.id('bingoSquares') },
  handler: async (ctx: MutationCtx, args) => {
    const square = await ctx.db.get(args.squareId)
    if (!square) throw new Error('Square not found.')
    if (square.category !== 'orange') {
      throw new Error('Only orange "find a team that did X" squares need a self-declaration.')
    }
    if (isSquareClosed(square)) {
      throw new Error('This task is closed — it has expired and can no longer be declared.')
    }
    if (!isSquareReleased(square)) {
      throw new Error('This challenge has not been released yet.')
    }
    const existing = await findExisting(ctx, args.teamId, args.squareId)
    if (existing && existing.status === 'approved') {
      return existing._id
    }
    const payload = {
      teamId: args.teamId,
      squareId: args.squareId,
      status: 'pending' as const,
      approvedByMentor: undefined,
      approvedAt: undefined,
      rejectedReason: undefined,
    }
    if (existing) {
      await ctx.db.replace(existing._id, payload)
      return existing._id
    }
    return await ctx.db.insert('teamEligibility', payload)
  },
})

export const withdraw = mutation({
  args: { teamId: v.id('teams'), squareId: v.id('bingoSquares') },
  handler: async (ctx: MutationCtx, args) => {
    const existing = await findExisting(ctx, args.teamId, args.squareId)
    if (!existing) return
    if (existing.status === 'approved') {
      throw new Error("Already approved — ask a mentor to revoke it on the admin panel.")
    }
    await ctx.db.delete(existing._id)
  },
})

export const listPending = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const pending = await ctx.db
      .query('teamEligibility')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect()
    pending.sort((a, b) => a._creationTime - b._creationTime)
    return await Promise.all(
      pending.map(async (e) => {
        const team = await ctx.db.get(e.teamId)
        const square = await ctx.db.get(e.squareId)
        return { eligibility: e, team, square }
      }),
    )
  },
})

export const approve = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    eligibilityId: v.id('teamEligibility'),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    await ctx.db.patch(args.eligibilityId, {
      status: 'approved',
      approvedByMentor: args.mentorName,
      approvedAt: Date.now(),
      rejectedReason: undefined,
    })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'approve_eligibility',
      metadata: { eligibilityId: args.eligibilityId },
    })
  },
})

export const reject = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    eligibilityId: v.id('teamEligibility'),
    reason: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    if (!args.reason.trim()) throw new Error('A rejection reason is required.')
    await ctx.db.patch(args.eligibilityId, {
      status: 'rejected',
      approvedByMentor: args.mentorName,
      approvedAt: Date.now(),
      rejectedReason: args.reason.trim(),
    })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'reject_eligibility',
      metadata: { eligibilityId: args.eligibilityId, reason: args.reason.trim() },
    })
  },
})

// Server-side helper used by completions.ts.
export async function assertEligible(
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  squareId: Id<'bingoSquares'>,
): Promise<void> {
  const row = await ctx.db
    .query('teamEligibility')
    .withIndex('by_team_and_square', (q) => q.eq('teamId', teamId).eq('squareId', squareId))
    .unique()
  if (!row || row.status !== 'approved') {
    const team = await ctx.db.get(teamId)
    const teamName = team?.name ?? 'That team'
    throw new Error(
      `"${teamName}" hasn't been verified for this feature yet. Ask them to declare it in their app and get their mentor's approval first.`,
    )
  }
}
