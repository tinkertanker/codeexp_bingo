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

  if (error) return <div className="p-8 text-bh-magenta bg-black min-h-screen bh-display">Error: {error}</div>
  if (!bundle) return <div className="p-8 text-bh-dim bg-black min-h-screen bh-display">Loading scoreboard…</div>

  const standings: Standing[] = computeStandings(bundle.teams, bundle.squares, bundle.completions, bundle.codeSubs)
  const teamsById = new Map(bundle.teams.map((t) => [t.id, t] as const))
  const winners: DrawWinner[] = bundle.game?.draw_winners ?? []
  const winnerIds = new Set(winners.map((w) => w.team_id))

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      {/* Pixel-grid backdrop + radial glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{
             backgroundImage:
               'radial-gradient(ellipse at 30% 0%, rgba(23,125,129,0.35), transparent 55%),' +
               'radial-gradient(ellipse at 80% 100%, rgba(166,251,0,0.18), transparent 55%),' +
               'linear-gradient(rgba(166,251,0,0.05) 1px, transparent 1px),' +
               'linear-gradient(90deg, rgba(166,251,0,0.05) 1px, transparent 1px)',
             backgroundSize: 'auto, auto, 40px 40px, 40px 40px',
           }} />
      {/* Stripe accents */}
      <div className="absolute top-6 left-10 h-1 w-40 bg-bh-lime" />
      <div className="absolute top-3 left-56 h-1 w-12 bg-bh-magenta" />
      <div className="absolute top-12 right-24 h-1 w-24 bg-bh-orange" />
      <div className="absolute bottom-10 right-40 h-1 w-32 bg-bh-cyan" />

      <div className="relative grid h-screen" style={{ gridTemplateColumns: '1.05fr 1fr' }}>
        <section className="p-8 flex flex-col">
          <header className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <img src="/code-exp-logo.png" alt="" className="w-14 h-14 drop-shadow-[0_0_18px_rgba(166,251,0,0.5)]" />
              <div>
                <div className="bh-display text-[0.7rem] text-bh-dim tracking-[0.2em]">— BRAINHACK 2026 —</div>
                <h1 className="bh-display text-4xl font-extrabold tracking-tight text-white">
                  CODE_EXP <span className="text-bh-lime">BINGO</span>
                </h1>
              </div>
            </div>
            {bundle.game && (
              <span
                className={[
                  'bh-display px-3 py-1 rounded text-xs font-bold uppercase tracking-widest ring-1',
                  bundle.game.is_open ? 'bg-bh-lime text-black ring-bh-lime shadow-neon-lime' : 'bg-bh-panel text-bh-dim ring-bh-line',
                ].join(' ')}
              >
                {bundle.game.is_open ? '● Live' : 'Closed'}
              </span>
            )}
          </header>
          <div className="text-xs text-bh-dim mb-3 bh-display tracking-wider">
            <span className="text-bh-lime">L</span> = lines · <span className="text-white">TOTAL</span> = lucky-draw entries (lines + clean-ZIP bonus)
          </div>
          <div className="flex-1 min-h-0 overflow-hidden bh-card p-2">
            <Leaderboard standings={standings} highlightTeamIds={winnerIds} />
          </div>
        </section>
        <section className="p-6 flex flex-col">
          <h2 className="bh-display text-2xl font-bold mb-3 text-white">Live photo wall</h2>
          <div className="flex-1 min-h-0 overflow-hidden">
            <PhotoWall photos={bundle.photos} teamsById={teamsById} cap={18} />
          </div>
        </section>
      </div>
      {winners.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-bh-lime text-black px-6 py-4 flex items-center justify-center gap-6 bh-display text-2xl font-extrabold shadow-[0_-8px_40px_rgba(166,251,0,0.45)]">
          <span>★ WINNERS</span>
          {winners
            .sort((a, b) => a.prize_rank - b.prize_rank)
            .map((w) => {
              const t = teamsById.get(w.team_id)
              return (
                <span key={w.team_id} className="px-3 py-1 rounded bg-black/15">
                  #{w.prize_rank} {t?.name ?? '(unknown)'}
                </span>
              )
            })}
        </div>
      )}
    </div>
  )
}
