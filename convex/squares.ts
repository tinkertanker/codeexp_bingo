import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { assertAdmin } from './admin'
import { logMentorAction } from './mentorActions'

export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const squares = await ctx.db.query('bingoSquares').collect()
    return squares.sort((a, b) => a.position - b.position)
  },
})

export const getByClaimSlug = query({
  args: { claimSlug: v.string() },
  handler: async (ctx: QueryCtx, { claimSlug }) => {
    return await ctx.db
      .query('bingoSquares')
      .withIndex('by_claim_slug', (q) => q.eq('claimSlug', claimSlug.trim()))
      .unique()
  },
})

// (4b) Admin schedule editor. Pass releaseAt to set, clearReleaseAt to unset.
// manuallyReleased: true (release now), false (force lock), or null (revert to auto).
export const adminUpdateSchedule = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    squareId: v.id('bingoSquares'),
    releaseAt: v.optional(v.number()),
    clearReleaseAt: v.optional(v.boolean()),
    manuallyReleased: v.optional(v.union(v.boolean(), v.null())),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    const square = await ctx.db.get(args.squareId)
    if (!square) throw new Error('Square not found.')

    const patch: Record<string, unknown> = {}
    if (args.clearReleaseAt) patch.releaseAt = undefined
    else if (args.releaseAt !== undefined) patch.releaseAt = args.releaseAt

    if (args.manuallyReleased === null) patch.manuallyReleased = undefined
    else if (typeof args.manuallyReleased === 'boolean') patch.manuallyReleased = args.manuallyReleased

    if (Object.keys(patch).length === 0) return
    await ctx.db.patch(args.squareId, patch)
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'schedule_square',
      metadata: { squareId: args.squareId, patch },
    })
  },
})
