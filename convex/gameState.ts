import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { assertAdmin, assertOrganiser, organiserNames } from './admin'
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

// (1) Admin-only fallback when ORGANISER_NAMES is misconfigured but the game still needs to open.
// Requires the admin passcode but not the organiser allow-list.
export const adminForceSetOpen = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    isOpen: v.boolean(),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    const game = await ensureGameRow(ctx)
    if (!game) throw new Error('Could not initialise game state.')
    await ctx.db.patch(game._id, { isOpen: args.isOpen })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: args.isOpen ? 'open_game' : 'close_game',
      metadata: { forced: true },
    })
  },
})

// (1) Surfaces the configured organiser list (server-side, sourced from env) so the UI
// can show why someone isn't allowed to flip the game open.
export const configInfo = query({
  args: {},
  handler: async () => {
    return { organiserNames: [...organiserNames()] }
  },
})
