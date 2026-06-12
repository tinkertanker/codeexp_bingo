import { v } from 'convex/values'
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import { assertAdmin } from './admin'

// Internal insert used by the HTTP endpoint (which can also capture the client IP).
export const insertLogin = internalMutation({
  args: {
    name: v.string(),
    at: v.number(),
    userAgent: v.optional(v.string()),
    ip: v.optional(v.string()),
    path: v.optional(v.string()),
    event: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    await ctx.db.insert('adminLogins', args)
  },
})

// Passcode-gated fallback used when the HTTP endpoint (which adds IP) is unreachable.
export const recordLogin = mutation({
  args: {
    passcode: v.string(),
    name: v.string(),
    userAgent: v.optional(v.string()),
    path: v.optional(v.string()),
    event: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.name.trim()) throw new Error('name is required.')
    await ctx.db.insert('adminLogins', {
      name: args.name.trim(),
      at: Date.now(),
      userAgent: args.userAgent,
      path: args.path,
      event: args.event,
    })
  },
})

export const list = query({
  args: { passcode: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    assertAdmin(args.passcode)
    return await ctx.db.query('adminLogins').withIndex('by_at').order('desc').take(1000)
  },
})
