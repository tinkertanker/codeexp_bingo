import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, type MutationCtx } from './_generated/server'
import { assertAdmin, assertOrganiser } from './admin'
import { logMentorAction } from './mentorActions'

const NUM_LINES = 10
const ALL_LINES: number[][] = (() => {
  const out: number[][] = []
  for (let r = 0; r < 4; r++) out.push([0, 1, 2, 3].map((c) => r * 4 + c))
  for (let c = 0; c < 4; c++) out.push([0, 1, 2, 3].map((r) => r * 4 + c))
  out.push([0, 5, 10, 15])
  out.push([3, 6, 9, 12])
  return out
})()

function countLines(positions: Set<number>): number {
  let n = 0
  for (const line of ALL_LINES) if (line.every((p) => positions.has(p))) n++
  return n
}

async function buildEntryPool(
  ctx: MutationCtx,
): Promise<{ pool: Id<'teams'>[]; eligibleCount: number }> {
  const teams = await ctx.db.query('teams').collect()
  const squares = await ctx.db.query('bingoSquares').collect()
  const squareById = new Map(squares.map((s) => [s._id, s] as const))
  const allCompletions = await ctx.db.query('squareCompletions').collect()
  const submissions = await ctx.db.query('codeSubmissions').collect()
  const subByTeam = new Map(submissions.map((s) => [s.teamId, s] as const))

  const pool: Id<'teams'>[] = []
  let eligibleCount = 0
  for (const team of teams) {
    const positions = new Set<number>()
    for (const c of allCompletions) {
      if (c.teamId !== team._id) continue
      if (c.status !== 'approved') continue
      const sq = squareById.get(c.squareId)
      if (sq) positions.add(sq.position)
    }
    const lines = countLines(positions)
    const sub = subByTeam.get(team._id)
    const bonus = sub?.zipClean === true ? 1 : 0
    const entries = Math.min(lines, NUM_LINES) + bonus
    if (entries > 0) eligibleCount += 1
    for (let i = 0; i < entries; i++) pool.push(team._id)
  }
  return { pool, eligibleCount }
}

function pickWinners(pool: Id<'teams'>[], count: number): Id<'teams'>[] {
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const winners: Id<'teams'>[] = []
  for (const id of shuffled) {
    if (!winners.includes(id)) winners.push(id)
    if (winners.length === count) break
  }
  return winners
}

export const run = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    count: v.number(),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    assertOrganiser(args.mentorName)
    if (args.count < 1 || args.count > 10) throw new Error('count must be between 1 and 10.')
    const { pool, eligibleCount } = await buildEntryPool(ctx)
    if (eligibleCount < args.count) {
      throw new Error(`Only ${eligibleCount} eligible team(s). Need at least ${args.count} with one or more entries.`)
    }
    const ids = pickWinners(pool, args.count)
    if (ids.length < args.count) throw new Error("Couldn't pick enough unique winners.")
    const winners = ids.map((teamId, idx) => ({ teamId, prizeRank: idx + 1 }))
    const game = await ctx.db.query('gameState').first()
    if (game) {
      await ctx.db.patch(game._id, { drawWinners: winners, drawAt: Date.now() })
    } else {
      await ctx.db.insert('gameState', { isOpen: false, drawWinners: winners, drawAt: Date.now() })
    }
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'draw',
      metadata: { winners },
    })
    return winners
  },
})

export const clearWinners = mutation({
  args: { passcode: v.string(), mentorName: v.string() },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    assertOrganiser(args.mentorName)
    const game = await ctx.db.query('gameState').first()
    if (!game) return
    await ctx.db.patch(game._id, { drawWinners: undefined, drawAt: undefined })
  },
})
