import type { BingoSquare, SquareCompletion } from '../lib/supabase'
import SquareCell from './SquareCell'

export type BingoGridProps = {
  squares: BingoSquare[]
  completions: SquareCompletion[]
  hrefForSquare: (square: BingoSquare) => string
}

export default function BingoGrid({ squares, completions, hrefForSquare }: BingoGridProps) {
  const completionByPosition = new Map<number, SquareCompletion>()
  for (const c of completions) {
    const sq = squares.find((s) => s.id === c.square_id)
    if (sq) completionByPosition.set(sq.position, c)
  }

  const ordered = [...squares].sort((a, b) => a.position - b.position)

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-2xl mx-auto">
      {ordered.map((sq) => {
        const completion = completionByPosition.get(sq.position)
        return (
          <SquareCell
            key={sq.id}
            square={sq}
            status={completion?.status ?? null}
            href={hrefForSquare(sq)}
          />
        )
      })}
    </div>
  )
}
