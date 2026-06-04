import { isCategoryLocked, isSquareClosed, isSquareReleased } from '../lib/squares'
import type { BingoSquare, SquareCompletion, Team } from '../lib/types'
import SquareCell from './SquareCell'

export type BingoGridProps = {
  team: Team
  squares: BingoSquare[]
  completions: SquareCompletion[]
  hrefForSquare: (square: BingoSquare) => string
}

export default function BingoGrid({ team, squares, completions, hrefForSquare }: BingoGridProps) {
  const completionByPosition = new Map<number, SquareCompletion>()
  for (const c of completions) {
    const sq = squares.find((s) => s._id === c.squareId)
    if (sq) completionByPosition.set(sq.position, c)
  }

  const ordered = [...squares].sort((a, b) => a.position - b.position)
  const now = Date.now()

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-2xl mx-auto">
      {ordered.map((sq) => {
        const completion = completionByPosition.get(sq.position)
        const categoryLocked = isCategoryLocked(sq, team)
        const closed = !categoryLocked && isSquareClosed(sq)
        const timedLocked = !categoryLocked && !closed && !isSquareReleased(sq, now) && !completion
        return (
          <SquareCell
            key={sq._id}
            square={sq}
            status={completion?.status ?? null}
            href={hrefForSquare(sq)}
            timedLocked={timedLocked}
            categoryLocked={categoryLocked}
            closed={closed}
          />
        )
      })}
    </div>
  )
}
