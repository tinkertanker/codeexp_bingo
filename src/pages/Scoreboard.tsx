import { useCallback, useEffect, useState } from 'react'
import Leaderboard from '../components/Leaderboard'
import PhotoWall from '../components/PhotoWall'
import { computeStandings, type Standing } from '../lib/standings'
import {
  supabase,
  type BingoSquare,
  type CodeSubmission,
  type DrawWinner,
  type GameState,
  type Photo,
  type SquareCompletion,
  type Team,
} from '../lib/supabase'

type Bundle = {
  teams: Team[]
  squares: BingoSquare[]
  completions: SquareCompletion[]
  photos: Photo[]
  codeSubs: Pick<CodeSubmission, 'team_id' | 'zip_clean'>[]
  game: GameState | null
}

export default function Scoreboard() {
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [teamsRes, squaresRes, compsRes, photosRes, subsRes, gameRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('bingo_squares').select('*').order('position'),
      supabase.from('square_completions').select('*'),
      supabase.from('photos').select('*').order('created_at', { ascending: false }).limit(60),
      supabase.from('code_submissions').select('team_id, zip_clean'),
      supabase.from('game_state').select('*').eq('id', 1).maybeSingle(),
    ])
    const firstError = [teamsRes, squaresRes, compsRes, photosRes, subsRes, gameRes].find((r) => r.error)?.error
    if (firstError) {
      setError(firstError.message)
      return
    }
    setBundle({
      teams: (teamsRes.data ?? []) as Team[],
      squares: (squaresRes.data ?? []) as BingoSquare[],
      completions: (compsRes.data ?? []) as SquareCompletion[],
      photos: (photosRes.data ?? []) as Photo[],
      codeSubs: (subsRes.data ?? []) as Pick<CodeSubmission, 'team_id' | 'zip_clean'>[],
      game: (gameRes.data ?? null) as GameState | null,
    })
  }, [])

  useEffect(() => {
    refresh()
    const channel = supabase
      .channel('scoreboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'square_completions' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'code_submissions' }, () => refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  if (error) return <div className="p-8 text-rose-300 bg-slate-900 min-h-screen">Error: {error}</div>
  if (!bundle) return <div className="p-8 text-slate-300 bg-slate-900 min-h-screen">Loading scoreboard…</div>

  const standings: Standing[] = computeStandings(bundle.teams, bundle.squares, bundle.completions, bundle.codeSubs)
  const teamsById = new Map(bundle.teams.map((t) => [t.id, t] as const))
  const winners: DrawWinner[] = bundle.game?.draw_winners ?? []
  const winnerIds = new Set(winners.map((w) => w.team_id))

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      <div className="grid h-screen" style={{ gridTemplateColumns: '1.05fr 1fr' }}>
        <section className="p-8 flex flex-col bg-white/95 text-slate-900">
          <header className="flex items-baseline justify-between mb-4">
            <h1 className="text-4xl font-extrabold tracking-tight">BrainHack Bingo</h1>
            {bundle.game && (
              <span
                className={[
                  'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
                  bundle.game.is_open ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600',
                ].join(' ')}
              >
                {bundle.game.is_open ? 'Live' : 'Closed'}
              </span>
            )}
          </header>
          <div className="text-xs text-slate-500 mb-2">
            <span className="font-semibold">L</span> = lines · <span className="font-semibold">total</span> = lucky-draw entries (lines + clean-ZIP bonus)
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <Leaderboard standings={standings} highlightTeamIds={winnerIds} />
          </div>
        </section>
        <section className="p-6 flex flex-col">
          <h2 className="text-2xl font-bold mb-3 text-slate-200">Live photo wall</h2>
          <div className="flex-1 min-h-0 overflow-hidden">
            <PhotoWall photos={bundle.photos} teamsById={teamsById} cap={18} />
          </div>
        </section>
      </div>
      {winners.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-amber-400 text-slate-900 px-6 py-4 flex items-center justify-center gap-6 text-2xl font-bold shadow-2xl">
          <span>🎉 Winners:</span>
          {winners
            .sort((a, b) => a.prize_rank - b.prize_rank)
            .map((w) => {
              const t = teamsById.get(w.team_id)
              return (
                <span key={w.team_id} className="px-3 py-1 rounded-lg bg-white/40">
                  #{w.prize_rank} {t?.name ?? '(unknown)'}
                </span>
              )
            })}
        </div>
      )}
    </div>
  )
}
