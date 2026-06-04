import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import { isOrganiser } from '../../lib/admin'
import { friendlyError } from '../../lib/errors'
import { computeStandings, type Standing } from '../../lib/standings'
import type { DrawWinner, Team, TeamColour, TeamId } from '../../lib/types'

const SPIN_TICK_MS = 70
const SPIN_DURATION_MS = 2400
const REVEAL_HOLD_MS = 1400

const swatchClass: Record<TeamColour, string> = {
  red: 'bg-team-red',
  blue: 'bg-team-blue',
  green: 'bg-team-green',
  yellow: 'bg-team-yellow',
  purple: 'bg-team-purple',
}

export default function DrawSpin() {
  return (
    <AdminLayout>
      {(creds) =>
        isOrganiser(creds.name) ? <Draw mentorName={creds.name} passcode={creds.passcode} /> : <NotOrganiser />
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

type Phase = 'idle' | 'spinning' | 'revealed' | 'done' | 'error'

function Draw({ mentorName, passcode }: { mentorName: string; passcode: string }) {
  const bundle = useQuery(api.scoreboard.bundle)
  const runDraw = useMutation(api.draw.run)
  const clearWinners = useMutation(api.draw.clearWinners)

  const [phase, setPhase] = useState<Phase>('idle')
  const [revealedWinners, setRevealedWinners] = useState<DrawWinner[]>([])
  const [tickName, setTickName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drawInProgress, setDrawInProgress] = useState(false)
  const [drawCount, setDrawCount] = useState(3)

  if (bundle === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading…</p>
  }

  const teamsById = new Map<TeamId, Team>(bundle.teams.map((t) => [t._id, t] as const))
  const standings: Standing[] = computeStandings(
    bundle.teams,
    bundle.squares,
    bundle.completions,
    bundle.submissions,
    bundle.eligibilities,
  )
  const eligible = standings.filter((s) => s.entries > 0)
  const totalEntries = eligible.reduce((sum, s) => sum + s.entries, 0)
  const existingWinners: DrawWinner[] = bundle.game?.drawWinners ?? []

  const drawOne = async (): Promise<boolean> => {
    setError(null)
    if (eligible.length === 0) {
      setError('No eligible teams with entries.')
      return false
    }
    let winners: DrawWinner[]
    try {
      winners = await runDraw({ passcode, mentorName, count: 1 })
    } catch (e) {
      setError(friendlyError(e, 'Draw failed.'))
      setPhase('error')
      return false
    }
    const w = winners[0]
    setPhase('spinning')
    const start = Date.now()
    while (Date.now() - start < SPIN_DURATION_MS) {
      const candidate = eligible[Math.floor(Math.random() * eligible.length)]
      setTickName(candidate.team.name)
      await sleep(SPIN_TICK_MS)
    }
    const winnerTeam = teamsById.get(w.teamId)
    setTickName(winnerTeam?.name ?? '???')
    setRevealedWinners((prev) => [...prev, w])
    setPhase('revealed')
    await sleep(REVEAL_HOLD_MS)
    setPhase('done')
    return true
  }

  const startDraw = async () => {
    setError(null)
    if (eligible.length < drawCount) {
      setError(`Only ${eligible.length} eligible team(s). Need at least ${drawCount} with one or more entries.`)
      return
    }
    setRevealedWinners([])
    setDrawInProgress(true)
    for (let i = 0; i < drawCount; i++) {
      const ok = await drawOne()
      if (!ok) break
    }
    setDrawInProgress(false)
  }

  const reset = async () => {
    if (!window.confirm('Clear the recorded winners? They will disappear from the live screen.')) return
    try {
      await clearWinners({ passcode, mentorName })
    } catch (e) {
      setError(friendlyError(e, 'Clear failed.'))
      return
    }
    setRevealedWinners([])
    setTickName(null)
    setPhase('idle')
  }

  return (
    <div className="space-y-6">
      <header className="bh-card p-4">
        <h2 className="bh-display text-xl font-bold mb-1 text-white">Lucky Draw</h2>
        <p className="text-sm text-bh-dim">
          Draw winners one at a time, weighted by lucky-draw entries (one per completed bingo line + bonuses).
          Result is broadcast to the live screen immediately.
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
          {phase === 'done' && (
            <div className="space-y-2">
              <div className="bh-display text-4xl font-extrabold text-bh-lime">All winners drawn!</div>
              <div className="text-sm text-bh-dim">Check the public live screen.</div>
            </div>
          )}
          {phase === 'error' && <div className="text-bh-magenta">{error}</div>}
          {phase === 'idle' && existingWinners.length > 0 && (
            <div className="text-bh-dim text-sm">Winners already drawn — see below.</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={async () => {
            setRevealedWinners([])
            setDrawInProgress(true)
            await drawOne()
            setDrawInProgress(false)
          }}
          disabled={phase === 'spinning' || phase === 'revealed' || drawInProgress}
          className="bh-btn-primary disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none"
        >
          Draw 1 winner
        </button>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={10}
            value={drawCount}
            onChange={(e) => setDrawCount(Math.max(1, Math.min(10, Number(e.target.value))))}
            className="w-14 rounded-md ring-1 ring-bh-line bg-black/40 px-2 py-1.5 text-sm text-white text-center focus:ring-bh-lime focus:outline-none"
          />
          <button
            onClick={startDraw}
            disabled={phase === 'spinning' || phase === 'revealed' || drawInProgress}
            className="bh-btn-ghost text-sm disabled:opacity-50"
          >
            Draw {drawCount} in a row
          </button>
        </div>
        {existingWinners.length > 0 && phase !== 'spinning' && phase !== 'revealed' && (
          <button onClick={reset} className="bh-display px-3 py-2 rounded-md ring-1 ring-bh-line text-bh-dim hover:text-bh-magenta hover:ring-bh-magenta/40 text-xs tracking-wider">
            Clear winners
          </button>
        )}
      </div>

      {(revealedWinners.length > 0 || (existingWinners.length > 0 && !drawInProgress)) && (
        <section>
          <h3 className="bh-display text-xs tracking-widest text-bh-lime mb-2">WINNERS</h3>
          <ol className="space-y-2">
            {(revealedWinners.length > 0
              ? revealedWinners
              : existingWinners
            ).map((w) => {
              const t = teamsById.get(w.teamId)
              if (!t) return null
              return (
                <li key={w.teamId} className="flex items-center gap-3 bh-card p-3">
                  <span className="bh-display text-2xl font-extrabold text-bh-lime">#{w.prizeRank}</span>
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
