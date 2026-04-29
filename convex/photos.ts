import { v } from 'convex/values'
import { query, type QueryCtx } from './_generated/server'

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: QueryCtx, { limit }) => {
    const cap = limit ?? 60
    const photos = await ctx.db.query('photos').order('desc').take(cap)
    return await Promise.all(
      photos.map(async (p) => ({
        ...p,
        url: await ctx.storage.getUrl(p.storageId),
      })),
    )
  },
})
