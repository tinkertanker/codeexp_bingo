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
  // (4b) True when releaseAt is in the future (or manuallyReleased=false) — hide mission text.
  timedLocked?: boolean
  // (5) True when restrictToCategory doesn't match the viewing team — show category lock.
  categoryLocked?: boolean
}

export default function SquareCell({ square, status, href, timedLocked, categoryLocked }: SquareCellProps) {
  const c = categoryClasses[square.category]

  if (categoryLocked) {
    return (
      <div
        className={[
          'relative aspect-square rounded-md p-2 sm:p-3 ring-1',
          'flex flex-col items-center justify-center text-center',
          'bg-bh-panel/40 ring-bh-line/60 opacity-70 cursor-not-allowed',
        ].join(' ')}
        aria-disabled
        title="Locked — not for your category"
      >
        <div className="bh-display text-[0.55rem] sm:text-[0.6rem] tracking-widest text-bh-dim/80">
          NOT YOUR CATEGORY
        </div>
        <div className="mt-1 text-[0.55rem] text-bh-dim/70 leading-snug">
          This square is reserved for the other category.
        </div>
      </div>
    )
  }

  if (timedLocked) {
    return (
      <div
        className={[
          'relative aspect-square rounded-md p-2 sm:p-3 ring-1',
          'flex flex-col items-center justify-center text-center',
          'cursor-not-allowed',
          c.bg,
          c.ring,
        ].join(' ')}
        aria-disabled
        aria-label="Mission not yet released"
        title="Mission not yet released"
      />
    )
  }

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
