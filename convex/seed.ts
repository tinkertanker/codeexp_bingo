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
  restrictToCategory?: 'cat1' | 'cat2'
}

// (5) Position 15 replaced: "User onboarding" → "Innovative use of AI" locked to cat1.
// cat2 teams will see a category-locked placeholder tile in its place.
const SQUARES: SeedSquare[] = [
  { position: 0,  category: 'blue',   title: 'Tech stack',                  description: 'Ask another team what tech stack they used.',                                    verificationKind: 'scan_team_with_answer', enforceColourDistinct: true },
  { position: 1,  category: 'grey',   title: 'Photo with a team',           description: 'Take a team photo with another team.',                                            verificationKind: 'photo_with_team',       enforceColourDistinct: false },
  { position: 2,  category: 'orange', title: 'Functional chatbot',          description: 'Find a team that has a functional chatbot feature.',                              verificationKind: 'scan_team',             enforceColourDistinct: false },
  { position: 3,  category: 'blue',   title: 'What makes you unique',       description: 'Ask another team what makes their solution unique.',                              verificationKind: 'scan_team_with_answer', enforceColourDistinct: true },
  { position: 4,  category: 'orange', title: 'Dark mode',                   description: 'Find a team that implemented dark mode.',                                         verificationKind: 'scan_team',             enforceColourDistinct: false },
  { position: 5,  category: 'grey',   title: 'Photo with a mentor',         description: 'Take a team photo with a mentor.',                                                verificationKind: 'photo_mentor',          enforceColourDistinct: false },
  { position: 6,  category: 'grey',   title: 'Photo on stage',              description: 'Take a team photo on stage.',                                                     verificationKind: 'photo_mentor',          enforceColourDistinct: false },
  { position: 7,  category: 'blue',   title: 'Biggest challenge',           description: 'Ask another team what their biggest challenge has been.',                         verificationKind: 'scan_team_with_answer', enforceColourDistinct: true },
  { position: 8,  category: 'wild',   title: 'Show off your project',       description: 'Upload a team selfie with your project to claim the wild card.',                  verificationKind: 'photo_auto',            enforceColourDistinct: false },
  { position: 9,  category: 'grey',   title: 'IG post #BH26',               description: 'Post a picture or story on Instagram with the BH26 hashtag, then paste the link.', verificationKind: 'ig_url_mentor',         enforceColourDistinct: false },
  { position: 10, category: 'grey',   title: 'Visit Deepfake booth',        description: 'Visit the Deepfake booth at the tech showcase and scan its QR poster.',           verificationKind: 'booth_qr',              enforceColourDistinct: false },
  { position: 11, category: 'orange', title: 'Authentication',              description: 'Find a team that implemented authentication / login.',                            verificationKind: 'scan_team',             enforceColourDistinct: false },
  { position: 12, category: 'orange', title: 'Testing',                     description: 'Find a team that did testing (e.g. shows test data / test cases).',               verificationKind: 'scan_team',             enforceColourDistinct: false },
  { position: 13, category: 'orange', title: 'Proper logging',              description: 'Find a team that has proper logging (info / warning / error).',                   verificationKind: 'scan_team',             enforceColourDistinct: false },
  { position: 14, category: 'blue',   title: "Feature you're proud of",     description: "Ask another team what feature they're most proud of.",                            verificationKind: 'scan_team_with_answer', enforceColourDistinct: true },
  { position: 15, category: 'orange', title: 'Innovative use of AI',        description: 'Find a team that has an innovative use of AI.',                                   verificationKind: 'scan_team',             enforceColourDistinct: false, restrictToCategory: 'cat1' },
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

// Re-export schema validators for this file's authoring convenience.
export { squareCategory, verificationKind }
