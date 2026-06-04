import type { BingoSquare, Team } from './types'

// (4b) Keep in sync with convex/lib.ts::isSquareReleased.
export function isSquareReleased(
  square: Pick<BingoSquare, 'releaseAt' | 'manuallyReleased' | 'closedAt'>,
  now: number = Date.now(),
): boolean {
  if (square.closedAt !== undefined) return false
  if (square.manuallyReleased === false) return false
  if (square.manuallyReleased === true) return true
  if (square.releaseAt === undefined) return true
  return now >= square.releaseAt
}

export function isSquareClosed(
  square: Pick<BingoSquare, 'closedAt'>,
): boolean {
  return square.closedAt !== undefined
}

// (5) cat1 is the default for any team without a category set yet.
export function effectiveCategory(team: Pick<Team, 'category'>): 'cat1' | 'cat2' {
  return team.category ?? 'cat1'
}

// (5) A square is "category-locked" for a given team when restrictToCategory is set
// and it doesn't match the team's category. The participant sees a placeholder.
export function isCategoryLocked(
  square: Pick<BingoSquare, 'restrictToCategory'>,
  team: Pick<Team, 'category'>,
): boolean {
  if (!square.restrictToCategory) return false
  return square.restrictToCategory !== effectiveCategory(team)
}
