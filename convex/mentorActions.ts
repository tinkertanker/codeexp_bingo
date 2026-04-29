import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

type MentorActionKind = Doc<'mentorActions'>['action']

export async function logMentorAction(
  ctx: MutationCtx,
  args: {
    mentorName: string
    action: MentorActionKind
    completionId?: Id<'squareCompletions'>
    metadata?: unknown
  },
): Promise<void> {
  await ctx.db.insert('mentorActions', {
    mentorName: args.mentorName,
    action: args.action,
    completionId: args.completionId,
    metadata: args.metadata,
  })
}
