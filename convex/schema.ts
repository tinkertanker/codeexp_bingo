import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const teamColour = v.union(
  v.literal('red'),
  v.literal('blue'),
  v.literal('green'),
  v.literal('yellow'),
  v.literal('purple'),
)

export const teamCategory = v.union(v.literal('cat1'), v.literal('cat2'))

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
  v.literal('approve_eligibility'),
  v.literal('reject_eligibility'),
  v.literal('set_category'),
  v.literal('set_problem_statement'),
  v.literal('update_team_metadata'),
  v.literal('schedule_square'),
  v.literal('edit_square_content'),
  v.literal('approve_code_submission'),
  v.literal('reject_code_submission'),
  v.literal('replace_photo'),
)

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    colour: teamColour,
    token: v.string(),
    // (5) Pre-assigned hackathon category. cat1 = Beginner, cat2 = Open. Undefined treated as cat1.
    category: v.optional(teamCategory),
    // DSTA problem-statement / mission id (see convex/problemStatements.ts). Used to sort the TV board.
    problemStatement: v.optional(v.string()),
    teamNumber: v.optional(v.string()),
    appName: v.optional(v.string()),
    description: v.optional(v.string()),
    pitchUrl: v.optional(v.string()),
    slideDeckUrl: v.optional(v.string()),
    wireframeUrl: v.optional(v.string()),
    architectureUrl: v.optional(v.string()),
  })
    .index('by_token', ['token'])
    .index('by_colour', ['colour']),

  bingoSquares: defineTable({
    position: v.number(),
    category: squareCategory,
    title: v.string(),
    description: v.string(),
    verificationKind,
    // (3) Was "no two scans share a team-colour"; now "no two scans share the same team".
    enforceColourDistinct: v.boolean(),
    // (4b) Timed release: a square is locked until releaseAt OR until manuallyReleased flips true.
    releaseAt: v.optional(v.number()),
    manuallyReleased: v.optional(v.boolean()),
    // Manually closed (expired). Distinct from "not released" — shows "Task Closed" in the UI.
    closedAt: v.optional(v.number()),
    // (5) Only teams of this category see/can complete this square. Others see a placeholder.
    restrictToCategory: v.optional(teamCategory),
    // Optional slug used by fixed event/booth QR posters, e.g. /claim/deepfake.
    claimSlug: v.optional(v.string()),
  })
    .index('by_position', ['position'])
    .index('by_claim_slug', ['claimSlug']),

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
    .index('by_status', ['status'])
    .index('by_scanned_team_id', ['scannedTeamId']),

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
    // Manual approval gate for +1 lucky draw entry.
    approvalStatus: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))),
    approvedByMentor: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
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

  // (2) Fan-favourites — one ranked ballot per (voter, category). rankedTeamIds is ordered
  // top→bottom (max 3). Every team votes in BOTH categories. votedTeamId is the legacy
  // single-pick field, kept optional so old rows still validate; no longer written.
  fanVotes: defineTable({
    voterTeamId: v.id('teams'),
    category: v.optional(teamCategory),
    rankedTeamIds: v.optional(v.array(v.id('teams'))),
    votedTeamId: v.optional(v.id('teams')),
  })
    .index('by_voter', ['voterTeamId'])
    .index('by_voter_and_category', ['voterTeamId', 'category']),

  // "Innovative use of AI" submission — one per team. Teams paste a Google Drive link; a Convex
  // action heuristically verifies it's publicly accessible. Hard deadline enforced server-side.
  aiSubmissions: defineTable({
    teamId: v.id('teams'),
    driveUrl: v.string(),
    accessible: v.optional(v.boolean()),
    checkResponse: v.optional(v.any()),
    checkedAt: v.optional(v.number()),
    submittedAt: v.number(),
  }).index('by_team', ['teamId']),

  // (4a) Self-declared eligibility for orange "find a team that did X" squares.
  // Mentor approves on the admin panel; scans against this team only succeed once approved.
  teamEligibility: defineTable({
    teamId: v.id('teams'),
    squareId: v.id('bingoSquares'),
    status: completionStatus,
    approvedByMentor: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    rejectedReason: v.optional(v.string()),
  })
    .index('by_team', ['teamId'])
    .index('by_team_and_square', ['teamId', 'squareId'])
    .index('by_status', ['status']),
})
