import { countCompletedLines } from './lines'
import type { BingoSquare, CodeSubmission, SquareCompletion, Team } from './supabase'

export type Standing = {
  team: Team
  lines: number
  bonus: number
  entries: number
}

export function computeStandings(
  teams: Team[],
  squares: BingoSquare[],
  completions: SquareCompletion[],
  codeSubs: Pick<CodeSubmission, 'team_id' | 'zip_clean'>[],
): Standing[] {
  const squareById = new Map(squares.map((s) => [s.id, s] as const))
  const standings = teams.map<Standing>((team) => {
    const completedPositions = new Set<number>()
    for (const c of completions) {
      if (c.team_id !== team.id) continue
      if (c.status !== 'approved') continue
      const sq = squareById.get(c.square_id)
      if (sq) completedPositions.add(sq.position)
    }
    const lines = countCompletedLines(completedPositions)
    const sub = codeSubs.find((s) => s.team_id === team.id)
    const bonus = sub?.zip_clean === true ? 1 : 0
    return { team, lines, bonus, entries: lines + bonus }
  })
  standings.sort((a, b) => b.entries - a.entries || b.lines - a.lines || a.team.name.localeCompare(b.team.name))
  return standings
}
