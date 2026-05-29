import { countCompletedLines } from './lines'
import { isCategoryLocked } from './squares'
import type { BingoSquare, CodeSubmission, SquareCompletion, Team, TeamId } from './types'

export type Standing = {
  team: Team
  lines: number
  bonus: number
  eligibilityBonus: number
  entries: number
}

// Returns the positions a team should be credited with for line-counting.
// Includes squares that are category-locked for the *other* category (auto-fill — see plan §5).
export function effectivelyFilledFor(
  team: Team,
  squares: BingoSquare[],
  completions: SquareCompletion[],
): Set<number> {
  const squareById = new Map<string, BingoSquare>(squares.map((s) => [s._id, s]))
  const filled = new Set<number>()
  for (const c of completions) {
    if (c.teamId !== team._id) continue
    if (c.status !== 'approved') continue
    const sq = squareById.get(c.squareId)
    if (sq) filled.add(sq.position)
  }
  for (const sq of squares) {
    if (isCategoryLocked(sq, team)) filled.add(sq.position)
  }
  return filled
}

export function computeStandings(
  teams: Team[],
  squares: BingoSquare[],
  completions: SquareCompletion[],
  codeSubs: Pick<CodeSubmission, 'teamId' | 'zipClean'>[],
  eligibilities?: Pick<{ teamId: TeamId; status: string }, 'teamId' | 'status'>[],
): Standing[] {
  const subByTeam = new Map<TeamId, Pick<CodeSubmission, 'teamId' | 'zipClean'>>(
    codeSubs.map((s) => [s.teamId, s]),
  )
  const eligByTeam = new Map<TeamId, number>()
  if (eligibilities) {
    for (const e of eligibilities) {
      if (e.status !== 'approved') continue
      eligByTeam.set(e.teamId, (eligByTeam.get(e.teamId) ?? 0) + 1)
    }
  }
  const standings = teams.map<Standing>((team) => {
    const filled = effectivelyFilledFor(team, squares, completions)
    const lines = countCompletedLines(filled)
    const sub = subByTeam.get(team._id)
    const bonus = sub?.zipClean === true ? 1 : 0
    const eligibilityBonus = eligByTeam.get(team._id) ?? 0
    return { team, lines, bonus, eligibilityBonus, entries: lines + bonus + eligibilityBonus }
  })
  standings.sort((a, b) => b.entries - a.entries || b.lines - a.lines || a.team.name.localeCompare(b.team.name))
  return standings
}
