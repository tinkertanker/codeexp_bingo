import { useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { isOrganiser } from '../../lib/admin'

const SPIN_TICK_MS = 70
const SPIN_DURATION_MS = 2400
const REVEAL_HOLD_MS = 1400
const BATCH_SIZE = 4

export default function Round2Draw() {
  return (
    <AdminLayout>
      {(creds) =>
        isOrganiser(creds.name) ? <Draw /> : <NotOrganiser />
      }
    </AdminLayout>
  )
}

function NotOrganiser() {
  return (
    <div className="p-8 bh-card">
      <h2 className="bh-display text-xl font-bold mb-2 text-white">Organiser-only</h2>
      <p className="text-sm text-bh-dim">
        Only organisers can manage the Round 2 presentation order.
      </p>
    </div>
  )
}

type Phase = 'idle' | 'spinning' | 'revealed' | 'done'

function Draw() {
  const [teamInputs, setTeamInputs] = useState<string[]>(Array(8).fill(''))
  const [pool, setPool] = useState<string[]>([])
  const [drawn, setDrawn] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [tickName, setTickName] = useState<string | null>(null)
  const [drawInProgress, setDrawInProgress] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  const validNames = [...new Set(teamInputs.map((n) => n.trim()).filter(Boolean))]
  const remaining = pool.filter((n) => !drawn.includes(n))

  const lockTeams = () => {
    const names = teamInputs.map((n) => n.trim()).filter(Boolean)
    const unique = [...new Set(names)]
    if (unique.length < 2) {
      setError('Enter at least 2 team names.')
      return
    }
    setPool(unique)
    setDrawn([])
    setLocked(true)
    setError(null)
    setPhase('idle')
  }

  const unlock = () => {
    if (drawn.length > 0 && !window.confirm('This will clear drawn results. Continue?')) return
    setLocked(false)
    setPool([])
    setDrawn([])
    setPhase('idle')
    setTickName(null)
    setError(null)
  }

  const drawBatch = async () => {
    if (remaining.length === 0) {
      setError('All teams have been drawn.')
      return
    }
    setError(null)
    setDrawInProgress(true)
    const batchSize = Math.min(BATCH_SIZE, remaining.length)
    const shuffled = [...remaining]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const batch = shuffled.slice(0, batchSize)
    const localDrawn = new Set<string>()

    for (const name of batch) {
      const candidates = remaining.filter((n) => !localDrawn.has(n))
      setPhase('spinning')
      const start = Date.now()
      while (Date.now() - start < SPIN_DURATION_MS) {
        const candidate = candidates[Math.floor(Math.random() * candidates.length)]
        setTickName(candidate)
        await sleep(SPIN_TICK_MS)
      }
      setTickName(name)
      localDrawn.add(name)
      setDrawn((prev) => [...prev, name])
      setPhase('revealed')
      await sleep(REVEAL_HOLD_MS)
      setPhase('done')
    }
    setDrawInProgress(false)
  }

  const resetDraw = () => {
    if (!window.confirm('Clear drawn results and start over?')) return
    setDrawn([])
    setPhase('idle')
    setTickName(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <header className="bh-card p-4">
        <h2 className="bh-display text-xl font-bold mb-1 text-white">Round 2 — Presentation Order</h2>
        <p className="text-sm text-bh-dim">
          Enter the team names, then draw {BATCH_SIZE} at a time to randomise presentation order.
        </p>
      </header>

      {!locked ? (
        <section className="bh-card p-4 space-y-3">
          <h3 className="bh-display text-xs tracking-widest text-bh-lime mb-2">ENTER TEAM NAMES</h3>
          <div className="grid grid-cols-2 gap-2">
            {teamInputs.map((val, idx) => (
              <input
                key={idx}
                type="text"
                placeholder={`Team ${idx + 1}`}
                value={val}
                onChange={(e) => {
                  const next = [...teamInputs]
                  next[idx] = e.target.value
                  setTeamInputs(next)
                }}
                className="rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white placeholder:text-bh-dim/50 focus:ring-bh-lime focus:outline-none"
              />
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={lockTeams}
              disabled={validNames.length < 2}
              className="bh-btn-primary disabled:opacity-50"
            >
              Lock {validNames.length} team{validNames.length !== 1 ? 's' : ''} & start
            </button>
            {validNames.length < 8 && (
              <span className="text-xs text-bh-dim">{8 - validNames.length} empty slot(s) — that's OK</span>
            )}
          </div>
        </section>
      ) : (
        <section className="bh-card p-3 flex items-center gap-3 text-sm text-bh-dim">
          <span className="bh-display tracking-wider text-bh-lime">{pool.length} TEAMS LOCKED</span>
          <span>·</span>
          <span>{remaining.length} remaining</span>
          <button onClick={unlock} disabled={drawInProgress} className="ml-auto text-xs bh-display tracking-wider text-bh-dim hover:text-bh-magenta disabled:opacity-50">
            Edit teams
          </button>
        </section>
      )}

      {locked && (
        <>
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
              {phase === 'idle' && drawn.length === 0 && (
                <p className="text-bh-dim bh-display tracking-wider">Press the button to draw the first batch.</p>
              )}
              {phase === 'spinning' && (
                <div className="bh-display text-5xl font-extrabold text-bh-lime animate-glitch drop-shadow-[0_0_18px_rgba(166,251,0,0.6)]">{tickName ?? '…'}</div>
              )}
              {phase === 'revealed' && (
                <div className="bh-display text-6xl font-extrabold text-bh-lime drop-shadow-[0_0_24px_rgba(166,251,0,0.85)]">★ {tickName} ★</div>
              )}
              {phase === 'done' && remaining.length === 0 && (
                <div className="space-y-2">
                  <div className="bh-display text-4xl font-extrabold text-bh-lime">All teams drawn!</div>
                  <div className="text-sm text-bh-dim">Presentation order is set.</div>
                </div>
              )}
              {phase === 'done' && remaining.length > 0 && (
                <div className="space-y-2">
                  <div className="bh-display text-3xl font-extrabold text-bh-lime">Batch complete!</div>
                  <div className="text-sm text-bh-dim">{remaining.length} team(s) remaining — draw again when ready.</div>
                </div>
              )}
              {phase === 'idle' && drawn.length > 0 && (
                <div className="text-bh-dim text-sm">Draw complete — see order below.</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={drawBatch}
              disabled={phase === 'spinning' || phase === 'revealed' || drawInProgress || remaining.length === 0}
              className="bh-btn-primary disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none"
            >
              Draw next {Math.min(BATCH_SIZE, remaining.length)} team{Math.min(BATCH_SIZE, remaining.length) !== 1 ? 's' : ''}
            </button>
            {drawn.length > 0 && !drawInProgress && (
              <button onClick={resetDraw} className="bh-display px-3 py-2 rounded-md ring-1 ring-bh-line text-bh-dim hover:text-bh-magenta hover:ring-bh-magenta/40 text-xs tracking-wider">
                Reset draw
              </button>
            )}
          </div>
        </>
      )}

      {drawn.length > 0 && (
        <section>
          <h3 className="bh-display text-xs tracking-widest text-bh-lime mb-2">PRESENTATION ORDER</h3>
          <ol className="space-y-2">
            {drawn.map((name, idx) => (
              <li key={name} className="flex items-center gap-3 bh-card p-3">
                <span className="bh-display text-2xl font-extrabold text-bh-lime">#{idx + 1}</span>
                <span className="bh-display text-base font-bold text-white">{name}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {error && <p className="text-sm text-bh-magenta">{error}</p>}
    </div>
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}
