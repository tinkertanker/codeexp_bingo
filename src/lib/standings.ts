import { countCompletedLines } from './lines'
import { isCategoryLocked } from './squares'
import type { BingoSquare, CodeSubmission, SquareCompletion, Team, TeamId } from './types'

export type Standing = {
  team: Team
  lines: number
  squares: number
  bonus: number
  githubBonus: number
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
  codeSubs: Pick<CodeSubmission, 'teamId' | 'zipClean' | 'approvalStatus'>[],
  eligibilities?: Pick<{ teamId: TeamId; status: string }, 'teamId' | 'status'>[],
): Standing[] {
  const subByTeam = new Map<TeamId, Pick<CodeSubmission, 'teamId' | 'zipClean' | 'approvalStatus'>>(
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
    // Manual override: restores a saved standings snapshot after data loss.
    if (team.manualChances !== undefined) {
      return {
        team,
        lines: team.manualLines ?? 0,
        squares: team.manualSquares ?? 0,
        bonus: 0,
        githubBonus: 0,
        eligibilityBonus: 0,
        // Match draw.ts: entries are floored/clamped so the displayed count equals the draw weight.
        entries: Math.max(0, Math.floor(team.manualChances)),
      }
    }
    const filled = effectivelyFilledFor(team, squares, completions)
    const lines = countCompletedLines(filled)
    const sub = subByTeam.get(team._id)
    const bonus = sub?.zipClean === true ? 1 : 0
    const githubBonus = sub?.approvalStatus === 'approved' ? 1 : 0
    const eligibilityBonus = eligByTeam.get(team._id) ?? 0
    return { team, lines, squares: filled.size, bonus, githubBonus, eligibilityBonus, entries: lines + bonus + githubBonus + eligibilityBonus }
  })
  standings.sort(
    (a, b) => b.entries - a.entries || b.lines - a.lines || b.squares - a.squares || a.team.name.localeCompare(b.team.name),
  )
  return standings
}
