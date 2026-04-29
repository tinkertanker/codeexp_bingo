import { useCallback, useEffect, useState } from 'react'
import { supabase, type BingoSquare, type GameState, type SquareCompletion, type Team } from '../lib/supabase'
import { saveTeamToken } from '../lib/token'

export type TeamData = {
  team: Team
  squares: BingoSquare[]
  completions: SquareCompletion[]
  gameOpen: boolean
}

type Status = 'loading' | 'ok' | 'not_found' | 'error'

export function useTeam(token: string | undefined) {
  const [status, setStatus] = useState<Status>('loading')
  const [data, setData] = useState<TeamData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!token) {
      setStatus('not_found')
      return
    }
    let cancelled = false
    ;(async () => {
      setStatus('loading')
      setError(null)
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('token', token)
        .maybeSingle()
      if (cancelled) return
      if (teamErr) {
        setStatus('error')
        setError(teamErr.message)
        return
      }
      if (!team) {
        setStatus('not_found')
        return
      }
      saveTeamToken(token)

      const [squaresRes, completionsRes, gameRes] = await Promise.all([
        supabase.from('bingo_squares').select('*').order('position'),
        supabase.from('square_completions').select('*').eq('team_id', team.id),
        supabase.from('game_state').select('is_open').eq('id', 1).maybeSingle(),
      ])
      if (cancelled) return
      const firstError = [squaresRes, completionsRes, gameRes].find((r) => r.error)?.error
      if (firstError) {
        setStatus('error')
        setError(firstError.message)
        return
      }
      setData({
        team: team as Team,
        squares: (squaresRes.data ?? []) as BingoSquare[],
        completions: (completionsRes.data ?? []) as SquareCompletion[],
        gameOpen: ((gameRes.data ?? null) as Pick<GameState, 'is_open'> | null)?.is_open ?? false,
      })
      setStatus('ok')
    })()
    return () => {
      cancelled = true
    }
  }, [token, refreshKey])

  useEffect(() => {
    if (!data?.team.id) return
    const teamId = data.team.id
    const channel = supabase
      .channel(`team:${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'square_completions', filter: `team_id=eq.${teamId}` },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state' },
        () => refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [data?.team.id, refresh])

  return { status, data, error, refresh }
}
