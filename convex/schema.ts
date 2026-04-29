import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const teamColour = v.union(
  v.literal('red'),
  v.literal('blue'),
  v.literal('green'),
  v.literal('yellow'),
)

export const squareCategory = v.union(
  v.literal('orange'),
  v.literal('blue'),
  v.literal('grey'),
  v.literal('wild'),
)

export const verificationKind = v.union(
  v.literal('scan_team'),
  v.literal('scan_team_with_answer'),
  v.literal('photo_with_team'),
  v.literal('photo_auto'),
  v.literal('photo_mentor'),
  v.literal('ig_url_mentor'),
  v.literal('booth_qr'),
)

export const completionStatus = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('rejected'),
)

export const mentorActionKind = v.union(
  v.literal('approve'),
  v.literal('reject'),
  v.literal('draw'),
  v.literal('open_game'),
  v.literal('close_game'),
  v.literal('regen_token'),
  v.literal('create_team'),
)

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    colour: teamColour,
    token: v.string(),
  })
    .index('by_token', ['token'])
    .index('by_colour', ['colour']),

  bingoSquares: defineTable({
    position: v.number(),
    category: squareCategory,
    title: v.string(),
    description: v.string(),
    verificationKind,
    enforceColourDistinct: v.boolean(),
  }).index('by_position', ['position']),

  squareCompletions: defineTable({
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
    status: completionStatus,
    scannedTeamId: v.optional(v.id('teams')),
    textAnswer: v.optional(v.string()),
    photoStorageId: v.optional(v.id('_storage')),
    igUrl: v.optional(v.string()),
    approvedByMentor: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    rejectedReason: v.optional(v.string()),
  })
    .index('by_team', ['teamId'])
    .index('by_team_and_square', ['teamId', 'squareId'])
    .index('by_status', ['status']),

  mentorActions: defineTable({
    mentorName: v.string(),
    action: mentorActionKind,
    completionId: v.optional(v.id('squareCompletions')),
    metadata: v.optional(v.any()),
  }),

  codeSubmissions: defineTable({
    teamId: v.id('teams'),
    githubUrl: v.string(),
    githubIsPublic: v.optional(v.boolean()),
    githubCheckResponse: v.optional(v.any()),
    zipStorageId: v.optional(v.id('_storage')),
    zipFilename: v.optional(v.string()),
    zipClean: v.optional(v.boolean()),
    zipCheckResponse: v.optional(v.any()),
  }).index('by_team', ['teamId']),

  photos: defineTable({
    teamId: v.id('teams'),
    completionId: v.optional(v.id('squareCompletions')),
    storageId: v.id('_storage'),
    caption: v.optional(v.string()),
  }),

  // Singleton: there's only ever one row, queried via .first().
  gameState: defineTable({
    isOpen: v.boolean(),
    drawWinners: v.optional(
      v.array(v.object({ teamId: v.id('teams'), prizeRank: v.number() })),
    ),
    drawAt: v.optional(v.number()),
  }),
})
