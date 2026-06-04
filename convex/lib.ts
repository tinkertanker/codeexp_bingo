import type { Doc } from './_generated/dataModel'

// (4b) A square is "released" iff manuallyReleased explicitly true, OR releaseAt unset,
// OR releaseAt is past. manuallyReleased explicitly false force-locks even past releaseAt.
// Mirrored client-side in src/lib/squares.ts — keep both in sync.
export function isSquareReleased(
  square: Pick<Doc<'bingoSquares'>, 'releaseAt' | 'manuallyReleased' | 'closedAt'>,
  now = Date.now(),
): boolean {
  if (square.closedAt !== undefined) return false
  if (square.manuallyReleased === false) return false
  if (square.manuallyReleased === true) return true
  if (square.releaseAt === undefined) return true
  return now >= square.releaseAt
}

export function isSquareClosed(
  square: Pick<Doc<'bingoSquares'>, 'closedAt'>,
): boolean {
  return square.closedAt !== undefined
}

// (5) Effective team category — undefined defaults to cat1 for backwards compat with seeded teams.
export function effectiveCategory(
  team: Pick<Doc<'teams'>, 'category'>,
): 'cat1' | 'cat2' {
  return team.category ?? 'cat1'
}
