import { query, type QueryCtx } from './_generated/server'

export const bundle = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const [teams, squares, completions, submissions, game, photosRaw, fanVotesRaw] = await Promise.all([
      ctx.db.query('teams').collect(),
      ctx.db.query('bingoSquares').collect(),
      ctx.db.query('squareCompletions').collect(),
      ctx.db.query('codeSubmissions').collect(),
      ctx.db.query('gameState').first(),
      ctx.db.query('photos').order('desc').take(60),
      ctx.db.query('fanVotes').collect(),
    ])
    const photos = await Promise.all(
      photosRaw.map(async (p) => ({ ...p, url: await ctx.storage.getUrl(p.storageId) })),
    )
    // (2) Compact fan-fav tally embedded so the scoreboard renders in one round-trip.
    const fanCounts = new Map<string, number>()
    for (const v of fanVotesRaw) {
      fanCounts.set(v.votedTeamId, (fanCounts.get(v.votedTeamId) ?? 0) + 1)
    }
    const fanFavs = teams
      .map((t) => ({ team: t, votes: fanCounts.get(t._id) ?? 0 }))
      .sort((a, b) => b.votes - a.votes || a.team.name.localeCompare(b.team.name))
    return { teams, squares, completions, submissions, game, photos, fanFavs, totalFanVotes: fanVotesRaw.length }
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
