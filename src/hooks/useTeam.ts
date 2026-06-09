import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { loadTeamToken, saveTeamToken } from '../lib/token'
import type { BingoSquare, GameState, SquareCompletion, Team, TeamEligibility } from '../lib/types'

export type TeamData = {
  team: Team
  squares: BingoSquare[]
  completions: SquareCompletion[]
  eligibilities: TeamEligibility[]
  zipClean: boolean
  githubApproved: boolean
  githubRejected: boolean
  gameOpen: boolean
  game: GameState | null
}

type Status = 'loading' | 'ok' | 'not_found'

export function useTeam(token: string | undefined) {
  const team = useQuery(api.teams.getByToken, token ? { token } : 'skip')
  const squares = useQuery(api.squares.list)
  const completions = useQuery(
    api.completions.listForTeam,
    team ? { teamId: team._id } : 'skip',
  )
  const game = useQuery(api.gameState.get)
  const eligibilities = useQuery(
    api.eligibility.listForTeam,
    team ? { teamId: team._id } : 'skip',
  )
  const codeSub = useQuery(
    api.codeSubmissions.getForTeam,
    team ? { teamId: team._id } : 'skip',
  )

  // Persist the token for return-visits — but only if no *different* team is
  // already stored.  This prevents a phone-camera scan of another team's QR
  // from silently hijacking the device's session.
  useEffect(() => {
    if (!team || !token) return
    const existing = loadTeamToken()
    if (!existing || existing === token) saveTeamToken(token)
  }, [team, token])

  let status: Status = 'loading'
  let data: TeamData | null = null
  if (!token || team === null) {
    status = 'not_found'
  } else if (team !== undefined && squares !== undefined && completions !== undefined && game !== undefined && eligibilities !== undefined && codeSub !== undefined) {
    status = 'ok'
    data = {
      team,
      squares: [...squares].sort((a, b) => a.position - b.position),
      completions,
      eligibilities,
      zipClean: codeSub?.zipClean === true,
      githubApproved: codeSub?.approvalStatus === 'approved',
      githubRejected: codeSub?.approvalStatus === 'rejected',
      gameOpen: game?.isOpen ?? false,
      game: game ?? null,
    }
  }

  // No-op kept for callers that want to imperatively refresh; Convex queries are reactive.
  const refresh = () => {}

  return { status, data, refresh }
}
