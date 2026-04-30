import { Link } from 'react-router-dom'
import type { BingoSquare, CompletionStatus, SquareCategory } from '../lib/types'

const categoryClasses: Record<SquareCategory, { bg: string; ring: string; ink: string }> = {
  orange: { bg: 'bg-bingo-orange-soft', ring: 'ring-bingo-orange/50',  ink: 'text-orange-200' },
  blue:   { bg: 'bg-bingo-blue-soft',   ring: 'ring-bingo-blue/60',    ink: 'text-blue-200' },
  grey:   { bg: 'bg-bingo-grey-soft',   ring: 'ring-white/20',         ink: 'text-slate-200' },
  wild:   { bg: 'bg-bingo-wild-soft',   ring: 'ring-bingo-wild/60',    ink: 'text-yellow-200' },
}

const statusOverlay: Record<CompletionStatus, string> = {
  approved: 'after:absolute after:inset-0 after:rounded-md after:bg-bh-lime/30 after:ring-1 after:ring-bh-lime after:content-[""] after:pointer-events-none after:shadow-[inset_0_0_24px_rgba(166,251,0,0.35)]',
  pending: 'after:absolute after:inset-0 after:rounded-md after:bg-bh-yellow/15 after:ring-1 after:ring-bh-yellow/60 after:content-[""] after:pointer-events-none',
  rejected: 'after:absolute after:inset-0 after:rounded-md after:bg-bh-magenta/15 after:ring-1 after:ring-bh-magenta/60 after:content-[""] after:pointer-events-none',
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
        'relative aspect-square rounded-md p-2 sm:p-3 ring-1 transition',
        'flex flex-col items-center justify-center text-center',
        'bg-bh-panel/60 backdrop-blur-sm',
        'hover:ring-bh-lime hover:scale-[1.02] active:scale-[0.99]',
        c.bg,
        c.ring,
        status ? statusOverlay[status] : '',
      ].join(' ')}
    >
      <div className={['text-[0.65rem] sm:text-xs font-semibold uppercase tracking-wide leading-snug', c.ink].join(' ')}>
        {square.title}
      </div>
      {status === 'approved' && (
        <div className="absolute top-1 right-1 z-10 bh-display text-bh-lime text-sm font-extrabold drop-shadow-[0_0_6px_rgba(166,251,0,0.8)]">✓</div>
      )}
      {status === 'pending' && (
        <div className="absolute top-1 right-1 z-10 bh-display text-bh-yellow text-[0.65rem] font-bold">…</div>
      )}
      {status === 'rejected' && (
        <div className="absolute top-1 right-1 z-10 bh-display text-bh-magenta text-[0.65rem] font-bold">×</div>
      )}
    </Link>
  )
}
