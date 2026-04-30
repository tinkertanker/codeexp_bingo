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
    return <div className="text-bh-dim text-sm bh-display">No teams yet.</div>
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
                  'flex items-center gap-2 rounded px-2 py-1.5 ring-1 transition',
                  highlighted
                    ? 'bg-bh-lime text-black ring-bh-lime shadow-neon-lime'
                    : 'bg-bh-surface/80 ring-bh-line text-white',
                ].join(' ')}
              >
                <span className={['bh-display w-6 text-right text-xs tabular-nums', highlighted ? 'text-black/70' : 'text-bh-dim'].join(' ')}>{rank}</span>
                <span className={['inline-block w-3 h-3 rounded-full', swatchClass[s.team.colour]].join(' ')} />
                <span className="flex-1 truncate text-sm font-medium">{s.team.name}</span>
                <span className={['text-xs tabular-nums', highlighted ? 'text-black/70' : 'text-bh-dim'].join(' ')}>{s.lines}L</span>
                <span className="bh-display text-sm font-extrabold tabular-nums">{s.entries}</span>
              </li>
            )
          })}
        </ol>
      ))}
    </div>
  )
}
