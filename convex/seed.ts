import { v } from 'convex/values'
import { mutation, type MutationCtx } from './_generated/server'
import { assertAdmin } from './admin'
import { squareCategory, verificationKind } from './schema'

type SeedSquare = {
  position: number
  category: 'orange' | 'blue' | 'grey' | 'wild'
  title: string
  description: string
  verificationKind:
    | 'scan_team'
    | 'scan_team_with_answer'
    | 'photo_with_team'
    | 'photo_auto'
    | 'photo_mentor'
    | 'ig_url_mentor'
    | 'booth_qr'
  enforceColourDistinct: boolean
  releaseAt?: number
  manuallyReleased?: boolean
  claimSlug?: string
  restrictToCategory?: 'cat1' | 'cat2'
}

const DAY_1_AFTER_LUNCH_MS = new Date('2026-06-10T13:00:00+08:00').getTime()

// Mission card from Samantha's Finals - Bingo Blast Card deck.
const SQUARES: SeedSquare[] = [
  { position: 0,  category: 'blue',   title: 'Tech stack',                  description: 'Find a team and learn what tech stack they used.',                                  verificationKind: 'scan_team_with_answer', enforceColourDistinct: true },
  { position: 1,  category: 'grey',   title: 'Be present at 9am',           description: 'Be present at 9am in the CODE_EXP hall and scan the briefing QR.',                   verificationKind: 'booth_qr',              enforceColourDistinct: false, claimSlug: 'arrive-9am' },
  { position: 2,  category: 'orange', title: 'Functional chatbot',          description: 'Find a team that has a functional chatbot feature.',                              verificationKind: 'scan_team',             enforceColourDistinct: false },
  { position: 3,  category: 'blue',   title: 'Try your app',                description: 'Find a team to try your application and get their feedback.',                       verificationKind: 'scan_team_with_answer', enforceColourDistinct: true, releaseAt: DAY_1_AFTER_LUNCH_MS },
  { position: 4,  category: 'orange', title: 'Dark mode',                   description: 'Find a team that implemented dark mode.',                                         verificationKind: 'scan_team',             enforceColourDistinct: false, releaseAt: DAY_1_AFTER_LUNCH_MS },
  { position: 5,  category: 'grey',   title: 'Photo with a mentor',         description: 'Take a team photo with a mentor.',                                                verificationKind: 'photo_mentor',          enforceColourDistinct: false },
  { position: 6,  category: 'grey',   title: 'Photo on stage',              description: 'Take a team photo on stage.',                                                     verificationKind: 'photo_mentor',          enforceColourDistinct: false },
  { position: 7,  category: 'blue',   title: 'Biggest challenge',           description: 'Ask another team what their biggest challenge has been.',                         verificationKind: 'scan_team_with_answer', enforceColourDistinct: true },
  { position: 8,  category: 'blue',   title: 'Short demo feedback',         description: 'Find a team to give a short demo and get their feedback.',                         verificationKind: 'scan_team_with_answer', enforceColourDistinct: true, releaseAt: DAY_1_AFTER_LUNCH_MS },
  { position: 9,  category: 'grey',   title: 'IG POST', description: 'Post a picture or story on Instagram with the #BrainHack2026 and #DSTA hashtags, then paste the link.', verificationKind: 'ig_url_mentor',         enforceColourDistinct: false },
  { position: 10, category: 'grey',   title: 'Deepfake booth challenge',    description: 'Complete the challenge at the Deepfake booth and scan its QR poster.',             verificationKind: 'booth_qr',              enforceColourDistinct: false, claimSlug: 'deepfake' },
  { position: 11, category: 'orange', title: 'Authentication',              description: 'Find a team that implemented authentication / login.',                            verificationKind: 'scan_team',             enforceColourDistinct: false },
  { position: 12, category: 'orange', title: 'Testing',                     description: 'Find a team that did testing, such as showing test data or test cases.',           verificationKind: 'scan_team',             enforceColourDistinct: false, releaseAt: DAY_1_AFTER_LUNCH_MS },
  { position: 13, category: 'orange', title: 'Proper logging',              description: 'Find a team that has proper logging, including info, warning, and error logs.',    verificationKind: 'scan_team',             enforceColourDistinct: false, releaseAt: DAY_1_AFTER_LUNCH_MS },
  { position: 14, category: 'blue',   title: "Feature you're proud of",     description: "Ask another team what feature they're most proud of.",                            verificationKind: 'scan_team_with_answer', enforceColourDistinct: true },
  { position: 15, category: 'orange', title: 'User onboarding',             description: 'Find a team that has a user onboarding or tutorial feature.',                      verificationKind: 'scan_team',             enforceColourDistinct: false },
]

export const seedAll = mutation({
  args: { passcode: v.string() },
  handler: async (ctx: MutationCtx, { passcode }) => {
    assertAdmin(passcode)
    const existing = await ctx.db.query('bingoSquares').collect()
    const byPosition = new Map(existing.map((s) => [s.position, s] as const))
    let inserted = 0
    let updated = 0
    for (const sq of SQUARES) {
      const cur = byPosition.get(sq.position)
      // Re-seed wipes restrictToCategory if not set in the seed row, so cat-locking is
      // always exactly what's in this file.
      const payload = {
        position: sq.position,
        category: sq.category,
        title: sq.title,
        description: sq.description,
        verificationKind: sq.verificationKind,
        enforceColourDistinct: sq.enforceColourDistinct,
        releaseAt: sq.releaseAt,
        manuallyReleased: sq.manuallyReleased,
        claimSlug: sq.claimSlug,
        restrictToCategory: sq.restrictToCategory,
      }
      if (cur) {
        await ctx.db.patch(cur._id, payload)
        updated++
      } else {
        await ctx.db.insert('bingoSquares', payload)
        inserted++
      }
    }
    const game = await ctx.db.query('gameState').first()
    if (!game) await ctx.db.insert('gameState', { isOpen: false })
    return { inserted, updated, totalSquares: SQUARES.length }
  },
})

/**
 * Nuclear reset: wipe all transactional data (completions, photos, eligibility,
 * code/AI submissions, fan votes, mentor actions, draw results) and re-seed the
 * bingo squares with the latest titles/descriptions. Teams are preserved.
 */
export const resetAll = mutation({
  args: { passcode: v.string() },
  handler: async (ctx: MutationCtx, { passcode }) => {
    assertAdmin(passcode)

    const counts: Record<string, number> = {}

    // 1. Photos — delete storage blobs then rows.
    const photos = await ctx.db.query('photos').collect()
    for (const p of photos) {
      await ctx.storage.delete(p.storageId)
      await ctx.db.delete(p._id)
    }
    counts.photos = photos.length

    // 2. Square completions — delete storage blobs for any photo evidence, then rows.
    const completions = await ctx.db.query('squareCompletions').collect()
    for (const c of completions) {
      if (c.photoStorageId) await ctx.storage.delete(c.photoStorageId)
      await ctx.db.delete(c._id)
    }
    counts.completions = completions.length

    // 3. Code submissions — delete ZIP storage blobs, then rows.
    const codeSubs = await ctx.db.query('codeSubmissions').collect()
    for (const s of codeSubs) {
      if (s.zipStorageId) await ctx.storage.delete(s.zipStorageId)
      await ctx.db.delete(s._id)
    }
    counts.codeSubmissions = codeSubs.length

    // 4. AI submissions.
    const aiSubs = await ctx.db.query('aiSubmissions').collect()
    for (const s of aiSubs) await ctx.db.delete(s._id)
    counts.aiSubmissions = aiSubs.length

    // 5. Team eligibility declarations.
    const eligibilities = await ctx.db.query('teamEligibility').collect()
    for (const e of eligibilities) await ctx.db.delete(e._id)
    counts.eligibilities = eligibilities.length

    // 6. Fan votes.
    const votes = await ctx.db.query('fanVotes').collect()
    for (const v of votes) await ctx.db.delete(v._id)
    counts.fanVotes = votes.length

    // 7. Mentor action audit trail.
    const actions = await ctx.db.query('mentorActions').collect()
    for (const a of actions) await ctx.db.delete(a._id)
    counts.mentorActions = actions.length

    // 8. Reset gameState (clear draw results, close game).
    const game = await ctx.db.query('gameState').first()
    if (game) {
      await ctx.db.patch(game._id, {
        isOpen: false,
        drawWinners: undefined,
        drawAt: undefined,
      })
    } else {
      await ctx.db.insert('gameState', { isOpen: false })
    }

    // 9. Re-seed bingo squares (update titles/descriptions/settings from SQUARES).
    const existing = await ctx.db.query('bingoSquares').collect()
    const byPosition = new Map(existing.map((s) => [s.position, s] as const))
    let squaresInserted = 0
    let squaresUpdated = 0
    for (const sq of SQUARES) {
      const cur = byPosition.get(sq.position)
      const payload = {
        position: sq.position,
        category: sq.category,
        title: sq.title,
        description: sq.description,
        verificationKind: sq.verificationKind,
        enforceColourDistinct: sq.enforceColourDistinct,
        releaseAt: sq.releaseAt,
        manuallyReleased: sq.manuallyReleased,
        claimSlug: sq.claimSlug,
        restrictToCategory: sq.restrictToCategory,
      }
      if (cur) {
        await ctx.db.patch(cur._id, payload)
        squaresUpdated++
      } else {
        await ctx.db.insert('bingoSquares', payload)
        squaresInserted++
      }
    }

    return { deleted: counts, squaresInserted, squaresUpdated }
  },
})

// Re-export schema validators for this file's authoring convenience.
export { squareCategory, verificationKind }
