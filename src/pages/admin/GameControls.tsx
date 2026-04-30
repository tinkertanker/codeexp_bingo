import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { isOrganiser, logMentorAction } from '../../lib/admin'
import { supabase, type GameState } from '../../lib/supabase'

export default function GameControls() {
  return <AdminLayout>{(creds) => <Controls mentorName={creds.name} />}</AdminLayout>
}

function Controls({ mentorName }: { mentorName: string }) {
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ teams: 0, completions: 0, photos: 0 })

  const load = useCallback(async () => {
    const [gs, teamsCount, compsCount, photosCount] = await Promise.all([
      supabase.from('game_state').select('*').eq('id', 1).maybeSingle(),
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      supabase.from('square_completions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('photos').select('id', { count: 'exact', head: true }),
    ])
    if (gs.error) setError(gs.error.message)
    else setState(gs.data as GameState)
    setStats({
      teams: teamsCount.count ?? 0,
      completions: compsCount.count ?? 0,
      photos: photosCount.count ?? 0,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const isOrg = isOrganiser(mentorName)

  const toggle = async () => {
    if (!isOrg) return setError('Only organisers can open or close the game.')
    if (!state) return
    setBusy(true)
    setError(null)
    const next = !state.is_open
    const { error } = await supabase.from('game_state').update({ is_open: next }).eq('id', 1)
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    await logMentorAction(mentorName, next ? 'open_game' : 'close_game', null)
    setBusy(false)
    load()
  }

  if (loading) return <p className="text-sm text-bh-dim bh-display">Loading…</p>

  return (
    <div className="space-y-6">
      <section className="bh-card p-4">
        <h2 className="bh-display text-xl font-bold mb-2 text-white">Game state</h2>
        <p className="text-sm text-bh-dim mb-3">
          When the game is closed, teams' bingo cards are read-only. They can still see the scoreboard.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={['bh-display px-2.5 py-1 rounded text-xs font-bold tracking-widest ring-1', state?.is_open ? 'bg-bh-lime text-black ring-bh-lime shadow-neon-lime' : 'bg-bh-panel text-bh-dim ring-bh-line'].join(' ')}>
            {state?.is_open ? '● OPEN' : 'CLOSED'}
          </span>
          <button
            onClick={toggle}
            disabled={busy || !isOrg}
            className="bh-btn-ghost text-xs disabled:opacity-50"
          >
            {state?.is_open ? 'Close game' : 'Open game'}
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
          <Stat label="Approved completions" value={stats.completions} />
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
