import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { saveTeamToken } from '../lib/token'
import type { BingoSquare, GameState, SquareCompletion, Team } from '../lib/types'

export type TeamData = {
  team: Team
  squares: BingoSquare[]
  completions: SquareCompletion[]
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

  // Persist the token for return-visits whenever we successfully resolve a team.
  useEffect(() => {
    if (team && token) saveTeamToken(token)
  }, [team, token])

  let status: Status = 'loading'
  let data: TeamData | null = null
  if (!token || team === null) {
    status = 'not_found'
  } else if (team !== undefined && squares !== undefined && completions !== undefined && game !== undefined) {
    status = 'ok'
    data = {
      team,
      squares: [...squares].sort((a, b) => a.position - b.position),
      completions,
      gameOpen: game?.isOpen ?? false,
      game: game ?? null,
    }
  }

  // No-op kept for callers that want to imperatively refresh; Convex queries are reactive.
  const refresh = () => {}

  return { status, data, refresh }
}
