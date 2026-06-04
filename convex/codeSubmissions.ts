import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { assertAdmin } from './admin'
import { logMentorAction } from './mentorActions'

export const getForTeam = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx: QueryCtx, { teamId }) => {
    const sub = await ctx.db
      .query('codeSubmissions')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .unique()
    if (!sub) return null
    const zipUrl = sub.zipStorageId ? await ctx.storage.getUrl(sub.zipStorageId) : null
    return { ...sub, zipUrl }
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const subs = await ctx.db.query('codeSubmissions').collect()
    const teams = await ctx.db.query('teams').collect()
    const teamMap = new Map(teams.map((t) => [t._id, t]))
    return subs.map((s) => ({ ...s, team: teamMap.get(s.teamId) ?? null }))
  },
})

export const save = mutation({
  args: {
    teamId: v.id('teams'),
    githubUrl: v.string(),
    githubIsPublic: v.optional(v.boolean()),
    githubCheckResponse: v.optional(v.any()),
    zipStorageId: v.optional(v.id('_storage')),
    zipFilename: v.optional(v.string()),
    zipClean: v.optional(v.boolean()),
    zipCheckResponse: v.optional(v.any()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const existing = await ctx.db
      .query('codeSubmissions')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .unique()
    if (existing) {
      const urlChanged = existing.githubUrl !== args.githubUrl
      await ctx.db.patch(existing._id, {
        githubUrl: args.githubUrl,
        githubIsPublic: args.githubIsPublic,
        githubCheckResponse: args.githubCheckResponse,
        ...(args.zipStorageId !== undefined ? { zipStorageId: args.zipStorageId } : {}),
        ...(args.zipFilename !== undefined ? { zipFilename: args.zipFilename } : {}),
        ...(args.zipClean !== undefined ? { zipClean: args.zipClean } : {}),
        ...(args.zipCheckResponse !== undefined ? { zipCheckResponse: args.zipCheckResponse } : {}),
        ...(urlChanged ? { approvalStatus: 'pending' as const, approvedByMentor: undefined, approvedAt: undefined } : {}),
      })
      return existing._id
    }
    return await ctx.db.insert('codeSubmissions', { ...args, approvalStatus: 'pending' as const })
  },
})

export const setApprovalStatus = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    submissionId: v.id('codeSubmissions'),
    status: v.union(v.literal('approved'), v.literal('rejected')),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required.')
    const sub = await ctx.db.get(args.submissionId)
    if (!sub) throw new Error('Submission not found.')
    await ctx.db.patch(args.submissionId, {
      approvalStatus: args.status,
      approvedByMentor: args.mentorName,
      approvedAt: Date.now(),
    })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: args.status === 'approved' ? 'approve_code_submission' : 'reject_code_submission',
      metadata: { submissionId: args.submissionId, teamId: sub.teamId },
    })
  },
})
