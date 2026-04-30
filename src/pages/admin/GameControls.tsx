import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import { isOrganiser } from '../../lib/admin'

export default function GameControls() {
  return <AdminLayout>{(creds) => <Controls mentorName={creds.name} passcode={creds.passcode} />}</AdminLayout>
}

function Controls({ mentorName, passcode }: { mentorName: string; passcode: string }) {
  const game = useQuery(api.gameState.get)
  const stats = useQuery(api.scoreboard.stats)
  const setOpen = useMutation(api.gameState.setOpen)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOrg = isOrganiser(mentorName)

  const toggle = async () => {
    if (!isOrg) return setError('Only organisers can open or close the game.')
    if (game === undefined) return
    setBusy(true)
    setError(null)
    try {
      await setOpen({ passcode, mentorName, isOpen: !(game?.isOpen ?? false) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed.')
    }
    setBusy(false)
  }

  if (game === undefined || stats === undefined) {
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
            disabled={busy || !isOrg}
            className="bh-btn-ghost text-xs disabled:opacity-50"
          >
            {game?.isOpen ? 'Close game' : 'Open game'}
          </button>
          {!isOrg && (
            <span className="text-xs text-bh-dim">Only organisers can flip this.</span>
          )}
        </div>
        {error && <p className="text-sm text-bh-magenta mt-2">{error}</p>}
      </section>

      <section className="bh-card p-4">
        <h2 className="bh-display text-xl font-bold mb-2 text-white">Live stats</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Teams" value={stats.teams} />
          <Stat label="Approved completions" value={stats.approvedCompletions} />
          <Stat label="Photos uploaded" value={stats.photos} />
        </div>
      </section>
    </div>
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
