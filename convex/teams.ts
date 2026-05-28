import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { assertAdmin } from './admin'
import { logMentorAction } from './mentorActions'
import { isValidProblemStatement } from './problemStatements'
import { teamCategory, teamColour } from './schema'

function generateToken(): string {
  // Random 20-char base16 token; opaque magic-link material.
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query('teams').collect()
  },
})

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx: QueryCtx, { token }) => {
    return await ctx.db
      .query('teams')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique()
  },
})

export const create = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    name: v.string(),
    colour: teamColour,
    category: v.optional(teamCategory),
    problemStatement: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    const trimmed = args.name.trim()
    if (!trimmed) throw new Error('Team name is required.')
    if (args.problemStatement && !isValidProblemStatement(args.problemStatement)) {
      throw new Error('Unknown problem statement.')
    }
    const token = generateToken()
    const id = await ctx.db.insert('teams', {
      name: trimmed,
      colour: args.colour,
      token,
      category: args.category ?? 'cat1',
      problemStatement: args.problemStatement || undefined,
    })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'create_team',
      metadata: { teamId: id, colour: args.colour, category: args.category ?? 'cat1', name: trimmed },
    })
    return { id, token }
  },
})

// (5) Admin can re-assign a team's category any time before/during the event.
export const setCategory = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    teamId: v.id('teams'),
    category: teamCategory,
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    await ctx.db.patch(args.teamId, { category: args.category })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'set_category',
      metadata: { teamId: args.teamId, category: args.category },
    })
  },
})

// Assign / change a team's DSTA problem statement (empty string clears it).
export const setProblemStatement = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    teamId: v.id('teams'),
    problemStatement: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    const value = args.problemStatement.trim()
    if (value && !isValidProblemStatement(value)) throw new Error('Unknown problem statement.')
    await ctx.db.patch(args.teamId, { problemStatement: value || undefined })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'set_problem_statement',
      metadata: { teamId: args.teamId, problemStatement: value || null },
    })
  },
})

export const regenerateToken = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    teamId: v.id('teams'),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    const token = generateToken()
    await ctx.db.patch(args.teamId, { token })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'regen_token',
      metadata: { teamId: args.teamId },
    })
    return { token }
  },
})
