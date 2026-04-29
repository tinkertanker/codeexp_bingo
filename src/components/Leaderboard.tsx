import type { Standing } from '../lib/standings'
import type { TeamColour } from '../lib/supabase'

const swatchClass: Record<TeamColour, string> = {
  red: 'bg-team-red',
  blue: 'bg-team-blue',
  green: 'bg-team-green',
  yellow: 'bg-team-yellow',
}

export type LeaderboardProps = {
  standings: Standing[]
  highlightTeamIds?: Set<string>
  rowsPerColumn?: number
}

export default function Leaderboard({ standings, highlightTeamIds, rowsPerColumn = 20 }: LeaderboardProps) {
  if (standings.length === 0) {
    return <div className="text-slate-400 text-sm">No teams yet.</div>
  }
  const columns: Standing[][] = []
  for (let i = 0; i < standings.length; i += rowsPerColumn) {
    columns.push(standings.slice(i, i + rowsPerColumn))
  }
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((col, i) => (
        <ol key={i} className="space-y-1">
          {col.map((s, idx) => {
            const rank = i * rowsPerColumn + idx + 1
            const highlighted = highlightTeamIds?.has(s.team.id)
            return (
              <li
                key={s.team.id}
                className={[
                  'flex items-center gap-2 rounded-md px-2 py-1.5',
                  highlighted ? 'bg-amber-200/60 ring-1 ring-amber-400' : 'bg-white/70',
                ].join(' ')}
              >
                <span className="w-6 text-right text-xs text-slate-400 tabular-nums">{rank}</span>
                <span className={['inline-block w-3 h-3 rounded-full', swatchClass[s.team.colour]].join(' ')} />
                <span className="flex-1 truncate text-sm font-medium text-slate-900">{s.team.name}</span>
                <span className="text-xs text-slate-500 tabular-nums">{s.lines}L</span>
                <span className="text-sm font-bold tabular-nums text-slate-900">{s.entries}</span>
              </li>
            )
          })}
        </ol>
      ))}
    </div>
  )
}
