import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { assertAdmin } from './admin'
import { logMentorAction } from './mentorActions'
import { teamColour } from './schema'

function generateToken(): string {
  // Random 20-char base16 token; opaque magic-link material.
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query('teams').collect()
  },
})

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx: QueryCtx, { token }) => {
    return await ctx.db
      .query('teams')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique()
  },
})

export const create = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    name: v.string(),
    colour: teamColour,
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    const trimmed = args.name.trim()
    if (!trimmed) throw new Error('Team name is required.')
    const token = generateToken()
    const id = await ctx.db.insert('teams', { name: trimmed, colour: args.colour, token })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'create_team',
      metadata: { teamId: id, colour: args.colour, name: trimmed },
    })
    return { id, token }
  },
})

export const regenerateToken = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    teamId: v.id('teams'),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    const token = generateToken()
    await ctx.db.patch(args.teamId, { token })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'regen_token',
      metadata: { teamId: args.teamId },
    })
    return { token }
  },
})
