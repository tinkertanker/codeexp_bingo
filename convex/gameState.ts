import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { assertAdmin, assertOrganiser } from './admin'
import { logMentorAction } from './mentorActions'

export const get = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query('gameState').first()
  },
})

async function ensureGameRow(ctx: MutationCtx) {
  const existing = await ctx.db.query('gameState').first()
  if (existing) return existing
  const id = await ctx.db.insert('gameState', { isOpen: false })
  return await ctx.db.get(id)
}

export const setOpen = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    isOpen: v.boolean(),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    assertOrganiser(args.mentorName)
    const game = await ensureGameRow(ctx)
    if (!game) throw new Error('Could not initialise game state.')
    await ctx.db.patch(game._id, { isOpen: args.isOpen })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: args.isOpen ? 'open_game' : 'close_game',
    })
  },
})
