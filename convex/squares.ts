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
    closed: v.optional(v.union(v.boolean(), v.null())),
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

    if (args.closed === true) patch.closedAt = Date.now()
    else if (args.closed === false || args.closed === null) patch.closedAt = undefined

    if (Object.keys(patch).length === 0) return
    await ctx.db.patch(args.squareId, patch)
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'schedule_square',
      metadata: { squareId: args.squareId, patch },
    })
  },
})

// Admin editor for a square's display text. Patches title/description by position
// without touching release/lock state (unlike a full re-seed via seedAll).
export const adminUpdateContent = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    position: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    const square = await ctx.db
      .query('bingoSquares')
      .withIndex('by_position', (q) => q.eq('position', args.position))
      .unique()
    if (!square) throw new Error('Square not found.')

    const patch: Record<string, string> = {}
    if (args.title !== undefined) {
      const title = args.title.trim()
      if (!title) throw new Error('Title cannot be empty.')
      patch.title = title
    }
    if (args.description !== undefined) {
      const description = args.description.trim()
      if (!description) throw new Error('Description cannot be empty.')
      patch.description = description
    }

    if (Object.keys(patch).length === 0) return
    await ctx.db.patch(square._id, patch)
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'edit_square_content',
      metadata: { position: args.position, patch },
    })
  },
})
