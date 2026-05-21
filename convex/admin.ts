import { v } from 'convex/values'
import { mutation, type MutationCtx } from './_generated/server'
import { logMentorAction } from './mentorActions'

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE ?? ''
const ORGANISER_NAMES = (process.env.ORGANISER_NAMES ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter((s) => s.length > 0)

export function assertAdmin(passcode: string): void {
  if (!ADMIN_PASSCODE) {
    throw new Error('ADMIN_PASSCODE is not configured on the Convex deployment.')
  }
  if (passcode !== ADMIN_PASSCODE) {
    throw new Error('Incorrect admin passcode.')
  }
}

export function isOrganiser(name: string): boolean {
  return ORGANISER_NAMES.includes(name.trim().toLowerCase())
}

export function assertOrganiser(name: string): void {
  if (ORGANISER_NAMES.length === 0) {
    throw new Error(
      'ORGANISER_NAMES is not configured on the Convex deployment. Run `npx convex env set ORGANISER_NAMES <name1,name2>` and reload.',
    )
  }
  if (!isOrganiser(name)) {
    throw new Error(
      `Only organisers can run this. Your name "${name}" isn't in ORGANISER_NAMES (${ORGANISER_NAMES.join(', ')}).`,
    )
  }
}

// Exposed so the admin UI can render the configured list when help is needed.
export const organiserNames = (): readonly string[] => ORGANISER_NAMES

export const approveCompletion = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    completionId: v.id('squareCompletions'),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    await ctx.db.patch(args.completionId, {
      status: 'approved',
      approvedByMentor: args.mentorName,
      approvedAt: Date.now(),
      rejectedReason: undefined,
    })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'approve',
      completionId: args.completionId,
    })
  },
})

export const rejectCompletion = mutation({
  args: {
    passcode: v.string(),
    mentorName: v.string(),
    completionId: v.id('squareCompletions'),
    reason: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    assertAdmin(args.passcode)
    if (!args.mentorName.trim()) throw new Error('mentorName is required for the audit trail.')
    if (!args.reason.trim()) throw new Error('A rejection reason is required.')
    await ctx.db.patch(args.completionId, {
      status: 'rejected',
      approvedByMentor: args.mentorName,
      approvedAt: Date.now(),
      rejectedReason: args.reason.trim(),
    })
    await logMentorAction(ctx, {
      mentorName: args.mentorName,
      action: 'reject',
      completionId: args.completionId,
      metadata: { reason: args.reason.trim() },
    })
  },
})
