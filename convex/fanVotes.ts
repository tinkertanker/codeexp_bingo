import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'

// (2) One row per voter team (upserted). Voting is always open — independent of gameState.isOpen.

export const getMyVote = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx: QueryCtx, { teamId }) => {
    return await ctx.db
      .query('fanVotes')
      .withIndex('by_voter', (q) => q.eq('voterTeamId', teamId))
      .unique()
  },
})

export const castVote = mutation({
  args: {
    teamId: v.id('teams'),
    votedTeamId: v.id('teams'),
  },
  handler: async (ctx: MutationCtx, args) => {
    if (args.teamId === args.votedTeamId) {
      throw new Error("You can't vote for your own team.")
    }
    const voter = await ctx.db.get(args.teamId)
    if (!voter) throw new Error('Voting team not found.')
    const voted = await ctx.db.get(args.votedTeamId)
    if (!voted) throw new Error("That team doesn't exist.")
    const existing = await ctx.db
      .query('fanVotes')
      .withIndex('by_voter', (q) => q.eq('voterTeamId', args.teamId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { votedTeamId: args.votedTeamId })
      return existing._id
    }
    return await ctx.db.insert('fanVotes', {
      voterTeamId: args.teamId,
      votedTeamId: args.votedTeamId,
    })
  },
})

export const tally = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const votes = await ctx.db.query('fanVotes').collect()
    const counts = new Map<string, number>()
    for (const v of votes) {
      counts.set(v.votedTeamId, (counts.get(v.votedTeamId) ?? 0) + 1)
    }
    const teams = await ctx.db.query('teams').collect()
    const rows = teams.map((t) => ({ team: t, votes: counts.get(t._id) ?? 0 }))
    rows.sort((a, b) => b.votes - a.votes || a.team.name.localeCompare(b.team.name))
    return { rows, totalVotes: votes.length }
  },
})

export const detailedTally = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const votes = await ctx.db.query('fanVotes').collect()
    const teams = await ctx.db.query('teams').collect()
    const teamById = new Map(teams.map((t) => [t._id, t] as const))
    const byVoted = new Map<string, { voter: typeof teams[number] | null }[]>()
    for (const vote of votes) {
      const arr = byVoted.get(vote.votedTeamId) ?? []
      arr.push({ voter: teamById.get(vote.voterTeamId) ?? null })
      byVoted.set(vote.votedTeamId, arr)
    }
    const rows = teams.map((t) => ({
      team: t,
      voters: (byVoted.get(t._id) ?? []).map((v) => v.voter),
    }))
    rows.sort((a, b) => b.voters.length - a.voters.length || a.team.name.localeCompare(b.team.name))
    return { rows, totalVotes: votes.length }
  },
})
