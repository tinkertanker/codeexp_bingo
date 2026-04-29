import { query, type QueryCtx } from './_generated/server'

export const bundle = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const [teams, squares, completions, submissions, game, photosRaw] = await Promise.all([
      ctx.db.query('teams').collect(),
      ctx.db.query('bingoSquares').collect(),
      ctx.db.query('squareCompletions').collect(),
      ctx.db.query('codeSubmissions').collect(),
      ctx.db.query('gameState').first(),
      ctx.db.query('photos').order('desc').take(60),
    ])
    const photos = await Promise.all(
      photosRaw.map(async (p) => ({ ...p, url: await ctx.storage.getUrl(p.storageId) })),
    )
    return { teams, squares, completions, submissions, game, photos }
  },
})

export const stats = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const [teams, completions, photos] = await Promise.all([
      ctx.db.query('teams').collect(),
      ctx.db.query('squareCompletions').collect(),
      ctx.db.query('photos').collect(),
    ])
    return {
      teams: teams.length,
      approvedCompletions: completions.filter((c) => c.status === 'approved').length,
      photos: photos.length,
    }
  },
})
