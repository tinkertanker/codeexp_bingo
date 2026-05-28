import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'

// Hard deadline for the "Best use of AI" submission: 10 Jun 2026, 18:00 Singapore time (UTC+8).
// Mirrored client-side via the `config` query so the countdown and the server agree.
export const AI_SUBMISSION_DEADLINE_MS = new Date('2026-06-10T18:00:00+08:00').getTime()

export const config = query({
  args: {},
  handler: async () => ({ deadline: AI_SUBMISSION_DEADLINE_MS }),
})

export const getForTeam = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx: QueryCtx, { teamId }) => {
    return await ctx.db
      .query('aiSubmissions')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .unique()
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const [subs, teams] = await Promise.all([
      ctx.db.query('aiSubmissions').collect(),
      ctx.db.query('teams').collect(),
    ])
    const teamById = new Map(teams.map((t) => [t._id, t] as const))
    return subs
      .map((s) => ({ ...s, team: teamById.get(s.teamId) ?? null }))
      .sort((a, b) => (a.team?.name ?? '').localeCompare(b.team?.name ?? ''))
  },
})

export const save = mutation({
  args: {
    teamId: v.id('teams'),
    driveUrl: v.string(),
    accessible: v.optional(v.boolean()),
    checkResponse: v.optional(v.any()),
  },
  handler: async (ctx: MutationCtx, args) => {
    if (Date.now() > AI_SUBMISSION_DEADLINE_MS) {
      throw new Error('The "Best use of AI" submission deadline (10 Jun, 6pm) has passed.')
    }
    const url = args.driveUrl.trim()
    if (!url) throw new Error('A Google Drive link is required.')
    const now = Date.now()
    const existing = await ctx.db
      .query('aiSubmissions')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        driveUrl: url,
        accessible: args.accessible,
        checkResponse: args.checkResponse,
        checkedAt: now,
        submittedAt: now,
      })
      return existing._id
    }
    return await ctx.db.insert('aiSubmissions', {
      teamId: args.teamId,
      driveUrl: url,
      accessible: args.accessible,
      checkResponse: args.checkResponse,
      checkedAt: now,
      submittedAt: now,
    })
  },
})
