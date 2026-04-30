import { Link } from 'react-router-dom'
import type { Team, TeamColour } from '../lib/types'

const colourSwatch: Record<TeamColour, string> = {
  red: 'bg-team-red shadow-neon-magenta',
  blue: 'bg-team-blue shadow-neon-cyan',
  green: 'bg-team-green shadow-neon-lime',
  yellow: 'bg-team-yellow',
}

const groupLabel: Record<TeamColour, string> = {
  red: 'Magenta group',
  blue: 'Cyan group',
  green: 'Lime group',
  yellow: 'Yellow group',
}

export type TeamHeaderProps = {
  team: Team
  lines: number
  entries: number
}

export default function TeamHeader({ team, lines, entries }: TeamHeaderProps) {
  return (
    <header className="relative mb-4 p-3 sm:p-4 bh-card flex items-center gap-3 overflow-hidden">
      <div className="absolute -top-1 left-6 h-1 w-16 bg-bh-lime" />
      <div className="absolute -bottom-1 right-6 h-1 w-12 bg-bh-magenta" />
      <img src="/code-exp-logo.png" alt="" className="hidden sm:block w-9 h-9 opacity-90 drop-shadow-[0_0_10px_rgba(166,251,0,0.45)]" />
      <div className={['w-5 h-5 rounded-full ring-2 ring-black/40', colourSwatch[team.colour]].join(' ')} />
      <div className="flex-1 min-w-0">
        <div className="bh-display text-base sm:text-lg font-bold truncate text-white">{team.name}</div>
        <div className="text-[0.65rem] uppercase tracking-wider text-bh-dim">{groupLabel[team.colour]}</div>
      </div>
      <div className="text-right pr-3 border-r border-bh-line">
        <div className="text-[0.6rem] text-bh-dim uppercase tracking-wider">Lines</div>
        <div className="bh-display text-2xl font-extrabold leading-none text-bh-lime">{lines}</div>
      </div>
      <div className="text-right pr-2">
        <div className="text-[0.6rem] text-bh-dim uppercase tracking-wider">Entries</div>
        <div className="bh-display text-2xl font-extrabold leading-none text-white">{entries}</div>
      </div>
      <Link
        to={`/t/${team.token}/qr`}
        className="bh-display ml-1 inline-flex items-center justify-center w-10 h-10 rounded-md bg-bh-lime text-black text-xs font-bold tracking-wider hover:shadow-neon-lime"
        aria-label="Show team QR"
      >
        QR
      </Link>
    </header>
  )
}
