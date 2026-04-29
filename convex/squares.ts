import { query, type QueryCtx } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const squares = await ctx.db.query('bingoSquares').collect()
    return squares.sort((a, b) => a.position - b.position)
  },
})
