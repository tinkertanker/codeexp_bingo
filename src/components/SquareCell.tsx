import { Link } from 'react-router-dom'
import type { BingoSquare, CompletionStatus, SquareCategory } from '../lib/supabase'

const categoryClasses: Record<SquareCategory, { bg: string; ring: string; label: string }> = {
  orange: { bg: 'bg-bingo-orange', ring: 'ring-bingo-orange-dark/40', label: 'Orange' },
  blue:   { bg: 'bg-bingo-blue',   ring: 'ring-bingo-blue-dark/40',   label: 'Blue' },
  grey:   { bg: 'bg-bingo-grey',   ring: 'ring-bingo-grey-dark/40',   label: 'Grey' },
  wild:   { bg: 'bg-bingo-wild',   ring: 'ring-bingo-wild-dark/40',   label: 'Wild' },
}

const statusOverlay: Record<CompletionStatus, string> = {
  approved: 'after:absolute after:inset-0 after:rounded-lg after:bg-emerald-500/25 after:content-[""] after:pointer-events-none',
  pending: 'after:absolute after:inset-0 after:rounded-lg after:bg-amber-300/25 after:content-[""] after:pointer-events-none',
  rejected: 'after:absolute after:inset-0 after:rounded-lg after:bg-rose-500/15 after:content-[""] after:pointer-events-none',
}

export type SquareCellProps = {
  square: BingoSquare
  status: CompletionStatus | null
  href: string
}

export default function SquareCell({ square, status, href }: SquareCellProps) {
  const c = categoryClasses[square.category]
  return (
    <Link
      to={href}
      className={[
        'relative aspect-square rounded-lg p-2 sm:p-3 ring-1 transition',
        'flex flex-col items-center justify-center text-center',
        'hover:ring-2 hover:scale-[1.02] active:scale-[0.99]',
        c.bg,
        c.ring,
        status ? statusOverlay[status] : '',
      ].join(' ')}
    >
      <div className="text-[0.65rem] sm:text-xs font-semibold uppercase tracking-wide text-slate-700/70">
        {square.title}
      </div>
      {status === 'approved' && (
        <div className="absolute top-1 right-1 z-10 text-emerald-700 text-lg">✓</div>
      )}
      {status === 'pending' && (
        <div className="absolute top-1 right-1 z-10 text-amber-700 text-xs font-bold">…</div>
      )}
    </Link>
  )
}
