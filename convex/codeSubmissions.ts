import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'

export const getForTeam = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx: QueryCtx, { teamId }) => {
    const sub = await ctx.db
      .query('codeSubmissions')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .unique()
    if (!sub) return null
    const zipUrl = sub.zipStorageId ? await ctx.storage.getUrl(sub.zipStorageId) : null
    return { ...sub, zipUrl }
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query('codeSubmissions').collect()
  },
})

export const save = mutation({
  args: {
    teamId: v.id('teams'),
    githubUrl: v.string(),
    githubIsPublic: v.optional(v.boolean()),
    githubCheckResponse: v.optional(v.any()),
    zipStorageId: v.optional(v.id('_storage')),
    zipFilename: v.optional(v.string()),
    zipClean: v.optional(v.boolean()),
    zipCheckResponse: v.optional(v.any()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const existing = await ctx.db
      .query('codeSubmissions')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        githubUrl: args.githubUrl,
        githubIsPublic: args.githubIsPublic,
        githubCheckResponse: args.githubCheckResponse,
        ...(args.zipStorageId !== undefined ? { zipStorageId: args.zipStorageId } : {}),
        ...(args.zipFilename !== undefined ? { zipFilename: args.zipFilename } : {}),
        ...(args.zipClean !== undefined ? { zipClean: args.zipClean } : {}),
        ...(args.zipCheckResponse !== undefined ? { zipCheckResponse: args.zipCheckResponse } : {}),
      })
      return existing._id
    }
    return await ctx.db.insert('codeSubmissions', args)
  },
})
