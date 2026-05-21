import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Team, TeamId } from '../lib/types'

// (2) Fan-favourite voting card on TeamHome. Self-vote is impossible by construction —
// the dropdown filters out the current team. Server re-checks defensively.
export default function FanFavCard({ team }: { team: Team }) {
  const teams = useQuery(api.teams.list)
  const myVote = useQuery(api.fanVotes.getMyVote, { teamId: team._id })
  const castVote = useMutation(api.fanVotes.castVote)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (teams === undefined || myVote === undefined) {
    return (
      <section className="mt-4 bh-card p-3">
        <p className="text-xs text-bh-dim bh-display">Loading fan-favourites…</p>
      </section>
    )
  }

  const others = teams
    .filter((t) => t._id !== team._id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const pick = async (votedTeamId: TeamId) => {
    setBusy(true)
    setError(null)
    try {
      await castVote({ teamId: team._id, votedTeamId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vote failed.')
    }
    setBusy(false)
  }

  return (
    <section className="mt-4 bh-card p-3">
      <h3 className="bh-display text-sm font-bold text-white mb-1">Fan favourite</h3>
      <p className="text-xs text-bh-dim mb-2">
        Vote for one other team you love. You can change your pick any time — voting stays open the whole event.
      </p>
      <select
        value={myVote?.votedTeamId ?? ''}
        disabled={busy}
        onChange={(e) => pick(e.target.value as TeamId)}
        className="w-full rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white focus:ring-bh-lime focus:outline-none"
      >
        <option value="" disabled>
          Pick a team…
        </option>
        {others.map((t) => (
          <option key={t._id} value={t._id} className="bg-bh-panel">
            {t.name}
          </option>
        ))}
      </select>
      {myVote && (
        <p className="text-xs text-bh-lime mt-2 bh-display tracking-wider">
          Your vote: {others.find((t) => t._id === myVote.votedTeamId)?.name ?? '—'}
        </p>
      )}
      {error && <p className="text-xs text-bh-magenta mt-1">{error}</p>}
    </section>
  )
}
