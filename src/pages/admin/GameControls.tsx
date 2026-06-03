import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import { isOrganiser } from '../../lib/admin'
import type { BingoSquareId } from '../../lib/types'

export default function GameControls() {
  return <AdminLayout>{(creds) => <Controls mentorName={creds.name} passcode={creds.passcode} />}</AdminLayout>
}

function Controls({ mentorName, passcode }: { mentorName: string; passcode: string }) {
  const game = useQuery(api.gameState.get)
  const stats = useQuery(api.scoreboard.stats)
  const config = useQuery(api.gameState.configInfo)
  const squares = useQuery(api.squares.list)
  const setOpen = useMutation(api.gameState.setOpen)
  const adminForceSetOpen = useMutation(api.gameState.adminForceSetOpen)
  const updateSchedule = useMutation(api.squares.adminUpdateSchedule)
  const resetProgress = useMutation(api.seed.resetProgress)
  const seedAll = useMutation(api.seed.seedAll)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [seedBusy, setSeedBusy] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)

  const isOrg = isOrganiser(mentorName)

  const toggle = async () => {
    if (game === undefined) return
    setBusy(true)
    setError(null)
    try {
      if (isOrg) {
        await setOpen({ passcode, mentorName, isOpen: !(game?.isOpen ?? false) })
      } else {
        await adminForceSetOpen({ passcode, mentorName, isOpen: !(game?.isOpen ?? false) })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed.')
    }
    setBusy(false)
  }

  if (game === undefined || stats === undefined || squares === undefined || config === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <section className="bh-card p-4">
        <h2 className="bh-display text-xl font-bold mb-2 text-white">Game state</h2>
        <p className="text-sm text-bh-dim mb-3">
          When the game is closed, teams' bingo cards are read-only. They can still see the scoreboard.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={['bh-display px-2.5 py-1 rounded text-xs font-bold tracking-widest ring-1', game?.isOpen ? 'bg-bh-lime text-black ring-bh-lime shadow-neon-lime' : 'bg-bh-panel text-bh-dim ring-bh-line'].join(' ')}>
            {game?.isOpen ? '● OPEN' : 'CLOSED'}
          </span>
          <button
            onClick={toggle}
            disabled={busy}
            className="bh-btn-ghost text-xs disabled:opacity-50"
          >
            {game?.isOpen ? 'Close game' : 'Open game'}
          </button>
        </div>
        {!isOrg && (
          <p className="text-xs text-bh-dim mt-2">
            You're not in the organiser list, but the admin-passcode bootstrap path will still let you open/close the game.
            Configured organisers (server-side):{' '}
            <span className="text-white">
              {config.organiserNames.length > 0 ? config.organiserNames.join(', ') : '(none — set ORGANISER_NAMES on the Convex deployment)'}
            </span>
            .
          </p>
        )}
        {error && <p className="text-sm text-bh-magenta mt-2">{error}</p>}
      </section>

      <TimedSquares
        squares={squares}
        passcode={passcode}
        mentorName={mentorName}
        updateSchedule={updateSchedule}
      />

      <section className="bh-card p-4">
        <h2 className="bh-display text-xl font-bold mb-2 text-white">Live stats</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Teams" value={stats.teams} />
          <Stat label="Approved completions" value={stats.approvedCompletions} />
          <Stat label="Photos uploaded" value={stats.photos} />
        </div>
      </section>

      <section className="bh-card p-4 ring-bh-magenta/40">
        <h2 className="bh-display text-xl font-bold mb-2 text-bh-magenta">Reset progress</h2>
        <p className="text-sm text-bh-dim mb-3">
          Wipe <strong>all</strong> completions, photos, eligibility declarations, code/AI submissions,
          fan votes, mentor actions, and draw results. Teams and bingo squares are preserved.
        </p>
        <button
          disabled={resetBusy}
          onClick={async () => {
            if (!window.confirm('This will permanently delete ALL progress data. Are you sure?')) return
            if (!window.confirm('Really? This cannot be undone.')) return
            setResetBusy(true)
            setResetResult(null)
            setResetError(null)
            try {
              const res = await resetProgress({ passcode })
              const d = res.deleted as Record<string, number>
              const parts = Object.entries(d)
                .filter(([, n]) => n > 0)
                .map(([k, n]) => `${n} ${k}`)
              setResetResult(
                `Done! Deleted ${parts.length > 0 ? parts.join(', ') : 'nothing'}.`,
              )
            } catch (e) {
              setResetError(e instanceof Error ? e.message : 'Reset failed.')
            }
            setResetBusy(false)
          }}
          className="bh-display px-3 py-2 rounded text-xs tracking-wider ring-1 ring-bh-magenta text-bh-magenta hover:bg-bh-magenta/10 disabled:opacity-50"
        >
          {resetBusy ? 'Resetting…' : 'Reset all progress'}
        </button>
        {resetResult && <p className="text-sm text-bh-lime mt-2">{resetResult}</p>}
        {resetError && <p className="text-sm text-bh-magenta mt-2">{resetError}</p>}
      </section>

      <section className="bh-card p-4 ring-bh-cyan/40">
        <h2 className="bh-display text-xl font-bold mb-2 text-bh-cyan">Reseed squares</h2>
        <p className="text-sm text-bh-dim mb-3">
          Update all 16 bingo square titles, descriptions, and settings from code.
          Does <strong>not</strong> touch progress data or teams.
        </p>
        <button
          disabled={seedBusy}
          onClick={async () => {
            setSeedBusy(true)
            setSeedResult(null)
            setSeedError(null)
            try {
              const res = await seedAll({ passcode })
              setSeedResult(
                `Done! ${res.updated} updated, ${res.inserted} inserted (${res.totalSquares} total).`,
              )
            } catch (e) {
              setSeedError(e instanceof Error ? e.message : 'Reseed failed.')
            }
            setSeedBusy(false)
          }}
          className="bh-display px-3 py-2 rounded text-xs tracking-wider ring-1 ring-bh-cyan text-bh-cyan hover:bg-bh-cyan/10 disabled:opacity-50"
        >
          {seedBusy ? 'Reseeding…' : 'Reseed bingo squares'}
        </button>
        {seedResult && <p className="text-sm text-bh-lime mt-2">{seedResult}</p>}
        {seedError && <p className="text-sm text-bh-magenta mt-2">{seedError}</p>}
      </section>
    </div>
  )
}

type SquareDoc = NonNullable<ReturnType<typeof useQuery<typeof api.squares.list>>>[number]

type UpdateScheduleFn = (args: {
  passcode: string
  mentorName: string
  squareId: BingoSquareId
  releaseAt?: number
  clearReleaseAt?: boolean
  manuallyReleased?: boolean | null
}) => Promise<unknown>

function TimedSquares({
  squares,
  passcode,
  mentorName,
  updateSchedule,
}: {
  squares: SquareDoc[]
  passcode: string
  mentorName: string
  updateSchedule: UpdateScheduleFn
}) {
  return (
    <section className="bh-card p-4">
      <h2 className="bh-display text-xl font-bold mb-2 text-white">Timed squares</h2>
      <p className="text-sm text-bh-dim mb-3">
        Set a release time per square, or flip the manual override. Locked squares show "Coming soon" on team cards and
        block submissions server-side.
      </p>
      <ul className="space-y-2">
        {[...squares]
          .sort((a, b) => a.position - b.position)
          .map((sq) => (
            <ScheduleRow
              key={sq._id}
              square={sq}
              passcode={passcode}
              mentorName={mentorName}
              updateSchedule={updateSchedule}
            />
          ))}
      </ul>
    </section>
  )
}

function toLocalInputValue(ms: number | undefined): string {
  if (ms === undefined) return ''
  const d = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ScheduleRow({
  square,
  passcode,
  mentorName,
  updateSchedule,
}: {
  square: SquareDoc
  passcode: string
  mentorName: string
  updateSchedule: UpdateScheduleFn
}) {
  const [draft, setDraft] = useState(toLocalInputValue(square.releaseAt))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const now = Date.now()
  const released =
    square.manuallyReleased === false
      ? false
      : square.manuallyReleased === true
      ? true
      : square.releaseAt === undefined
      ? true
      : now >= square.releaseAt

  const run = async (patch: {
    releaseAt?: number
    clearReleaseAt?: boolean
    manuallyReleased?: boolean | null
  }) => {
    setBusy(true)
    setErr(null)
    try {
      await updateSchedule({ passcode, mentorName, squareId: square._id, ...patch })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed.')
    }
    setBusy(false)
  }

  return (
    <li className="rounded-md ring-1 ring-bh-line bg-bh-panel/50 p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={[
            'bh-display px-2 py-0.5 rounded text-[0.6rem] tracking-wider ring-1',
            released ? 'ring-bh-lime text-bh-lime' : 'ring-bh-yellow text-bh-yellow',
          ].join(' ')}
        >
          {released ? 'RELEASED' : 'LOCKED'}
        </span>
        <span className="bh-display text-xs text-bh-dim w-6 text-right tabular-nums">{square.position}</span>
        <span className="text-sm text-white truncate flex-1 min-w-[140px]">{square.title}</span>
      </div>
      <div className="mt-2 flex items-end gap-2 flex-wrap">
        <label className="block">
          <span className="bh-display text-[0.6rem] tracking-wider text-bh-dim">Release at</span>
          <input
            type="datetime-local"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-0.5 rounded-md ring-1 ring-bh-line bg-black/40 px-2 py-1 text-xs text-white focus:ring-bh-lime focus:outline-none"
          />
        </label>
        <button
          disabled={busy || !draft}
          onClick={() => run({ releaseAt: new Date(draft).getTime(), manuallyReleased: null })}
          className="bh-btn-ghost text-[0.65rem] disabled:opacity-50"
        >
          Save time
        </button>
        <button
          disabled={busy}
          onClick={() => {
            setDraft('')
            return run({ clearReleaseAt: true, manuallyReleased: null })
          }}
          className="bh-display px-2 py-1.5 rounded text-[0.65rem] tracking-wider ring-1 ring-bh-line text-bh-dim hover:text-white disabled:opacity-50"
        >
          Clear time
        </button>
        <button
          disabled={busy}
          onClick={() => run({ manuallyReleased: true })}
          className="bh-display px-2 py-1.5 rounded text-[0.65rem] tracking-wider ring-1 ring-bh-lime/40 text-bh-lime hover:bg-bh-lime/10 disabled:opacity-50"
        >
          Release now
        </button>
        <button
          disabled={busy}
          onClick={() => run({ manuallyReleased: false })}
          className="bh-display px-2 py-1.5 rounded text-[0.65rem] tracking-wider ring-1 ring-bh-magenta/40 text-bh-magenta hover:bg-bh-magenta/10 disabled:opacity-50"
        >
          Force lock
        </button>
        <button
          disabled={busy}
          onClick={() => run({ manuallyReleased: null })}
          className="bh-display px-2 py-1.5 rounded text-[0.65rem] tracking-wider ring-1 ring-bh-line text-bh-dim hover:text-white disabled:opacity-50"
        >
          Auto
        </button>
      </div>
      {err && <p className="text-xs text-bh-magenta mt-1">{err}</p>}
    </li>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-bh-surface ring-1 ring-bh-line p-3">
      <div className="bh-display text-3xl font-extrabold text-bh-lime">{value}</div>
      <div className="text-xs text-bh-dim mt-1">{label}</div>
    </div>
  )
}
