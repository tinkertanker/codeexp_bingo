import { Link } from 'react-router-dom'
import type { Team, TeamColour } from '../lib/supabase'

const colourSwatch: Record<TeamColour, string> = {
  red: 'bg-team-red',
  blue: 'bg-team-blue',
  green: 'bg-team-green',
  yellow: 'bg-team-yellow',
}

export type TeamHeaderProps = {
  team: Team
  lines: number
  entries: number
}

export default function TeamHeader({ team, lines, entries }: TeamHeaderProps) {
  return (
    <header className="flex items-center gap-3 mb-4 px-1">
      <div className={['w-6 h-6 rounded-full ring-2 ring-white shadow', colourSwatch[team.colour]].join(' ')} />
      <div className="flex-1 min-w-0">
        <div className="text-lg font-semibold truncate">{team.name}</div>
        <div className="text-xs text-slate-500 capitalize">{team.colour} group</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-slate-500 uppercase tracking-wide">Lines</div>
        <div className="text-2xl font-bold leading-none">{lines}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-slate-500 uppercase tracking-wide">Entries</div>
        <div className="text-2xl font-bold leading-none">{entries}</div>
      </div>
      <Link
        to={`/t/${team.token}/qr`}
        className="ml-1 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800 text-white text-xs font-semibold"
        aria-label="Show team QR"
      >
        QR
      </Link>
    </header>
  )
}
