import { countCompletedLines } from './lines'
import type { BingoSquare, CodeSubmission, SquareCompletion, Team, TeamId } from './types'

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
  codeSubs: Pick<CodeSubmission, 'teamId' | 'zipClean'>[],
): Standing[] {
  const squareById = new Map<string, BingoSquare>(squares.map((s) => [s._id, s]))
  const subByTeam = new Map<TeamId, Pick<CodeSubmission, 'teamId' | 'zipClean'>>(
    codeSubs.map((s) => [s.teamId, s]),
  )
  const standings = teams.map<Standing>((team) => {
    const completedPositions = new Set<number>()
    for (const c of completions) {
      if (c.teamId !== team._id) continue
      if (c.status !== 'approved') continue
      const sq = squareById.get(c.squareId)
      if (sq) completedPositions.add(sq.position)
    }
    const lines = countCompletedLines(completedPositions)
    const sub = subByTeam.get(team._id)
    const bonus = sub?.zipClean === true ? 1 : 0
    return { team, lines, bonus, entries: lines + bonus }
  })
  standings.sort((a, b) => b.entries - a.entries || b.lines - a.lines || a.team.name.localeCompare(b.team.name))
  return standings
}
