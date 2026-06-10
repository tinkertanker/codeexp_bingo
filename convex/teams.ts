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

const teamMetadata = v.object({
  name: v.string(),
  teamNumber: v.optional(v.string()),
  appName: v.optional(v.string()),
  description: v.optional(v.string()),
  pitchUrl: v.optional(v.string()),
  slideDeckUrl: v.optional(v.string()),
  wireframeUrl: v.optional(v.string()),
  architectureUrl: v.optional(v.string()),
})

function cleanOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normaliseTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export const bulkUpdateMetadata = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    teams: v.array(teamMetadata),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    const existing = await ctx.db.query('teams').collect()
    const byName = new Map(existing.map((team) => [normaliseTeamName(team.name), team] as const))
    let updated = 0
    const missing: string[] = []

    for (const item of args.teams) {
      const team = byName.get(normaliseTeamName(item.name))
      if (!team) {
        missing.push(item.name)
        continue
      }
      const patch: Record<string, string | undefined> = {}
      if (item.teamNumber !== undefined) patch.teamNumber = cleanOptional(item.teamNumber)
      if (item.appName !== undefined) patch.appName = cleanOptional(item.appName)
      if (item.description !== undefined) patch.description = cleanOptional(item.description)
      if (item.pitchUrl !== undefined) patch.pitchUrl = cleanOptional(item.pitchUrl)
      if (item.slideDeckUrl !== undefined) patch.slideDeckUrl = cleanOptional(item.slideDeckUrl)
      if (item.wireframeUrl !== undefined) patch.wireframeUrl = cleanOptional(item.wireframeUrl)
      if (item.architectureUrl !== undefined) patch.architectureUrl = cleanOptional(item.architectureUrl)
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(team._id, patch)
      }
      updated++
    }

    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'update_team_metadata',
      metadata: { updated, missing },
    })
    return { updated, missing }
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

// Rename a team (e.g. fix a typo in the seeded list).
export const rename = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    teamId: v.id('teams'),
    name: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    const name = args.name.trim()
    if (!name) throw new Error('Team name cannot be empty.')
    const team = await ctx.db.get(args.teamId)
    if (!team) throw new Error('Team not found.')
    const previous = team.name
    await ctx.db.patch(args.teamId, { name })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'rename_team',
      metadata: { teamId: args.teamId, previous, name },
    })
    return { previous, name }
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

const ALL_COLOURS = ['red', 'blue', 'green', 'yellow', 'purple'] as const

export const rebalanceColours = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    const teams = await ctx.db.query('teams').collect()
    teams.sort((a, b) => a._creationTime - b._creationTime)
    let changed = 0
    for (let i = 0; i < teams.length; i++) {
      const colour = ALL_COLOURS[i % ALL_COLOURS.length]
      if (teams[i].colour !== colour) {
        await ctx.db.patch(teams[i]._id, { colour })
        changed++
      }
    }
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'update_team_metadata',
      metadata: { action: 'rebalance_colours', total: teams.length, changed },
    })
    return { total: teams.length, changed }
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
