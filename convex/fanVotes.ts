import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { effectiveCategory } from './lib'
import { teamCategory } from './schema'

// (2) Fan-favourites — every team casts a ranked top-3 ballot for EACH category
// (cat1 = Beginner, cat2 = Open). One row per (voter, category). Voting is always open,
// independent of gameState.isOpen. Borda scoring: 1st = 3 pts, 2nd = 2, 3rd = 1.

const RANK_POINTS = [3, 2, 1] // index 0 = 1st place

export type RankedTallyRow = {
  team: Doc<'teams'>
  points: number
  first: number
  second: number
  third: number
}

export type RankedTally = {
  cat1: { rows: RankedTallyRow[]; ballots: number }
  cat2: { rows: RankedTallyRow[]; ballots: number }
}

// Shared so the scoreboard bundle and the admin tally agree exactly.
export function computeRankedTally(
  votes: Doc<'fanVotes'>[],
  teams: Doc<'teams'>[],
): RankedTally {
  const teamById = new Map(teams.map((t) => [t._id, t] as const))
  const build = (category: 'cat1' | 'cat2') => {
    const ballots = votes.filter(
      (vote) =>
        vote.category === category &&
        Array.isArray(vote.rankedTeamIds) &&
        vote.rankedTeamIds.length > 0,
    )
    const agg = new Map<string, { points: number; first: number; second: number; third: number }>()
    for (const ballot of ballots) {
      ;(ballot.rankedTeamIds ?? []).slice(0, 3).forEach((teamId, i) => {
        const cur = agg.get(teamId) ?? { points: 0, first: 0, second: 0, third: 0 }
        cur.points += RANK_POINTS[i] ?? 0
        if (i === 0) cur.first++
        else if (i === 1) cur.second++
        else cur.third++
        agg.set(teamId, cur)
      })
    }
    const rows: RankedTallyRow[] = []
    for (const [teamId, a] of agg) {
      const team = teamById.get(teamId as Id<'teams'>)
      if (team) rows.push({ team, ...a })
    }
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.first - a.first ||
        b.second - a.second ||
        a.team.name.localeCompare(b.team.name),
    )
    return { rows, ballots: ballots.length }
  }
  return { cat1: build('cat1'), cat2: build('cat2') }
}

export const getMyBallots = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx: QueryCtx, { teamId }) => {
    const mine = await ctx.db
      .query('fanVotes')
      .withIndex('by_voter', (q) => q.eq('voterTeamId', teamId))
      .collect()
    const pick = (category: 'cat1' | 'cat2') =>
      mine.find((r) => r.category === category)?.rankedTeamIds ?? []
    return { cat1: pick('cat1'), cat2: pick('cat2') }
  },
})

export const setBallot = mutation({
  args: {
    teamId: v.id('teams'),
    category: teamCategory,
    rankedTeamIds: v.array(v.id('teams')),
  },
  handler: async (ctx: MutationCtx, args) => {
    const voter = await ctx.db.get(args.teamId)
    if (!voter) throw new Error('Voting team not found.')
    const ranked = args.rankedTeamIds
    if (ranked.length > 3) throw new Error('Pick at most 3 teams.')
    if (new Set(ranked).size !== ranked.length) throw new Error('No duplicate picks.')
    if (ranked.some((id) => id === args.teamId)) {
      throw new Error("You can't vote for your own team.")
    }
    for (const id of ranked) {
      const t = await ctx.db.get(id)
      if (!t) throw new Error("A picked team doesn't exist.")
      if (effectiveCategory(t) !== args.category) {
        throw new Error('You can only rank teams from that category.')
      }
    }

    const mine = await ctx.db
      .query('fanVotes')
      .withIndex('by_voter', (q) => q.eq('voterTeamId', args.teamId))
      .collect()
    const existing = mine.find((r) => r.category === args.category)
    if (existing) {
      await ctx.db.patch(existing._id, { rankedTeamIds: ranked })
    } else {
      await ctx.db.insert('fanVotes', {
        voterTeamId: args.teamId,
        category: args.category,
        rankedTeamIds: ranked,
      })
    }
    // Drop any legacy single-pick row (no category) for this voter.
    for (const row of mine.filter((r) => r.category === undefined)) {
      await ctx.db.delete(row._id)
    }
  },
})

export const tallyByCategory = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const [votes, teams] = await Promise.all([
      ctx.db.query('fanVotes').collect(),
      ctx.db.query('teams').collect(),
    ])
    return computeRankedTally(votes, teams)
  },
})
