import { mutation, type MutationCtx } from './_generated/server'

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    return await ctx.storage.generateUploadUrl()
  },
})
