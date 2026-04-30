import { useCallback, useEffect, useRef, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { isOrganiser, logMentorAction } from '../../lib/admin'
import { pickWinners } from '../../lib/draw'
import { computeStandings, type Standing } from '../../lib/standings'
import {
  supabase,
  type BingoSquare,
  type CodeSubmission,
  type DrawWinner,
  type GameState,
  type SquareCompletion,
  type Team,
  type TeamColour,
} from '../../lib/supabase'

const NUM_WINNERS = 3
const SPIN_TICK_MS = 70
const SPIN_DURATION_MS = 2400
const REVEAL_HOLD_MS = 1400

const swatchClass: Record<TeamColour, string> = {
  red: 'bg-team-red',
  blue: 'bg-team-blue',
  green: 'bg-team-green',
  yellow: 'bg-team-yellow',
}

export default function DrawSpin() {
  return (
    <AdminLayout>
      {(creds) =>
        isOrganiser(creds.name) ? <Draw mentorName={creds.name} /> : <NotOrganiser />
      }
    </AdminLayout>
  )
}

function NotOrganiser() {
  return (
    <div className="p-8 bh-card">
      <h2 className="bh-display text-xl font-bold mb-2 text-white">Organiser-only</h2>
      <p className="text-sm text-bh-dim">
        Only organisers (listed in <code className="font-mono text-bh-lime">VITE_ORGANISER_NAMES</code>) can run the lucky draw.
      </p>
    </div>
  )
}

type Phase = 'idle' | 'spinning' | 'revealed' | 'saving' | 'done' | 'error'

function Draw({ mentorName }: { mentorName: string }) {
  const [standings, setStandings] = useState<Standing[]>([])
  const [game, setGame] = useState<GameState | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [revealedIds, setRevealedIds] = useState<string[]>([])
  const [tickName, setTickName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const teamsById = useRef<Map<string, Team>>(new Map())

  const refresh = useCallback(async () => {
    const [teamsRes, squaresRes, compsRes, subsRes, gameRes] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('bingo_squares').select('*'),
      supabase.from('square_completions').select('*'),
      supabase.from('code_submissions').select('team_id, zip_clean'),
      supabase.from('game_state').select('*').eq('id', 1).maybeSingle(),
    ])
    const teams = (teamsRes.data ?? []) as Team[]
    teamsById.current = new Map(teams.map((t) => [t.id, t]))
    const squares = (squaresRes.data ?? []) as BingoSquare[]
    const comps = (compsRes.data ?? []) as SquareCompletion[]
    const subs = (subsRes.data ?? []) as Pick<CodeSubmission, 'team_id' | 'zip_clean'>[]
    setStandings(computeStandings(teams, squares, comps, subs))
    setGame((gameRes.data ?? null) as GameState | null)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const eligible = standings.filter((s) => s.entries > 0)
  const totalEntries = eligible.reduce((sum, s) => sum + s.entries, 0)
  const existingWinners: DrawWinner[] = game?.draw_winners ?? []

  const runDraw = async () => {
    setError(null)
    if (eligible.length < NUM_WINNERS) {
      setError(`Only ${eligible.length} eligible team(s). Need at least ${NUM_WINNERS} with one or more entries.`)
      return
    }
    const winners = pickWinners(standings, NUM_WINNERS)
    if (winners.length < NUM_WINNERS) {
      setError("Couldn't pick enough unique winners.")
      return
    }
    setRevealedIds([])
    for (let i = 0; i < winners.length; i++) {
      setPhase('spinning')
      const start = Date.now()
      while (Date.now() - start < SPIN_DURATION_MS) {
        const candidate = eligible[Math.floor(Math.random() * eligible.length)]
        setTickName(candidate.team.name)
        await sleep(SPIN_TICK_MS)
      }
      const winnerTeam = teamsById.current.get(winners[i])
      setTickName(winnerTeam?.name ?? '???')
      setRevealedIds((prev) => [...prev, winners[i]])
      setPhase('revealed')
      await sleep(REVEAL_HOLD_MS)
    }
    setPhase('saving')
    const payload: DrawWinner[] = winners.map((id, idx) => ({ team_id: id, prize_rank: idx + 1 }))
    const { error: updateErr } = await supabase
      .from('game_state')
      .update({ draw_winners: payload, draw_at: new Date().toISOString() })
      .eq('id', 1)
    if (updateErr) {
      setError(updateErr.message)
      setPhase('error')
      return
    }
    await logMentorAction(mentorName, 'draw', null, { winners: payload })
    setPhase('done')
    refresh()
  }

  const reset = async () => {
    if (!window.confirm('Clear the recorded winners? They will disappear from the scoreboard.')) return
    const { error: updateErr } = await supabase.from('game_state').update({ draw_winners: null, draw_at: null }).eq('id', 1)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setRevealedIds([])
    setTickName(null)
    setPhase('idle')
    refresh()
  }

  return (
    <div className="space-y-6">
      <header className="bh-card p-4">
        <h2 className="bh-display text-xl font-bold mb-1 text-white">Lucky Draw</h2>
        <p className="text-sm text-bh-dim">
          Picks {NUM_WINNERS} winners weighted by lucky-draw entries (one per completed bingo line + one bonus for a
          clean ZIP submission). Result is broadcast to the public scoreboard immediately.
        </p>
        <div className="mt-2 bh-display text-[0.7rem] tracking-widest text-bh-lime">
          {eligible.length} ELIGIBLE TEAM(S) · {totalEntries} TOTAL ENTRIES
        </div>
      </header>

      <div className="relative rounded-2xl p-8 text-center min-h-[14rem] flex flex-col items-center justify-center overflow-hidden bh-card">
        <div className="absolute inset-0 pointer-events-none opacity-30"
             style={{
               backgroundImage:
                 'radial-gradient(ellipse at center, rgba(166,251,0,0.45), transparent 60%),' +
                 'linear-gradient(rgba(166,251,0,0.12) 1px, transparent 1px),' +
                 'linear-gradient(90deg, rgba(166,251,0,0.12) 1px, transparent 1px)',
               backgroundSize: 'auto, 20px 20px, 20px 20px',
             }} />
        <div className="absolute -top-1 left-10 h-1 w-24 bg-bh-lime" />
        <div className="absolute -bottom-1 right-10 h-1 w-32 bg-bh-magenta" />
        <div className="relative">
          {phase === 'idle' && existingWinners.length === 0 && (
            <p className="text-bh-dim bh-display tracking-wider">Press the button when you're ready to draw.</p>
          )}
          {phase === 'spinning' && (
            <div className="bh-display text-5xl font-extrabold text-bh-lime animate-glitch drop-shadow-[0_0_18px_rgba(166,251,0,0.6)]">{tickName ?? '…'}</div>
          )}
          {phase === 'revealed' && (
            <div className="bh-display text-6xl font-extrabold text-bh-lime drop-shadow-[0_0_24px_rgba(166,251,0,0.85)]">★ {tickName} ★</div>
          )}
          {phase === 'saving' && <p className="bh-display tracking-widest text-bh-dim animate-pulse">SAVING…</p>}
          {phase === 'done' && (
            <div className="space-y-2">
              <div className="bh-display text-4xl font-extrabold text-bh-lime">All winners drawn!</div>
              <div className="text-sm text-bh-dim">Check the public scoreboard.</div>
            </div>
          )}
          {phase === 'error' && <div className="text-bh-magenta">{error}</div>}
          {phase === 'idle' && existingWinners.length > 0 && (
            <div className="text-bh-dim text-sm">Winners already drawn — see below.</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={runDraw}
          disabled={phase === 'spinning' || phase === 'revealed' || phase === 'saving'}
          className="bh-btn-primary disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none"
        >
          {existingWinners.length > 0 ? 'Re-draw' : `Draw ${NUM_WINNERS} winners`}
        </button>
        {existingWinners.length > 0 && phase !== 'spinning' && phase !== 'revealed' && (
          <button onClick={reset} className="bh-display px-3 py-2 rounded-md ring-1 ring-bh-line text-bh-dim hover:text-bh-magenta hover:ring-bh-magenta/40 text-xs tracking-wider">
            Clear winners
          </button>
        )}
      </div>

      {(revealedIds.length > 0 || existingWinners.length > 0) && (
        <section>
          <h3 className="bh-display text-xs tracking-widest text-bh-lime mb-2">WINNERS</h3>
          <ol className="space-y-2">
            {(revealedIds.length > 0
              ? revealedIds.map((id, idx) => ({ team_id: id, prize_rank: idx + 1 }))
              : existingWinners
            ).map((w) => {
              const t = teamsById.current.get(w.team_id)
              if (!t) return null
              return (
                <li key={w.team_id} className="flex items-center gap-3 bh-card p-3">
                  <span className="bh-display text-2xl font-extrabold text-bh-lime">#{w.prize_rank}</span>
                  <span className={['inline-block w-4 h-4 rounded-full', swatchClass[t.colour]].join(' ')} />
                  <span className="bh-display text-base font-bold text-white">{t.name}</span>
                </li>
              )
            })}
          </ol>
        </section>
      )}
      {error && phase !== 'error' && <p className="text-sm text-bh-magenta">{error}</p>}
    </div>
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}
