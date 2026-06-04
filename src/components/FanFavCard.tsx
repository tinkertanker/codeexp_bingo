import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { categoryLabel } from '../lib/categories'
import { friendlyError } from '../lib/errors'
import { effectiveCategory } from '../lib/squares'
import type { Team, TeamCategory, TeamId } from '../lib/types'

const RANK_LABELS = ['1st', '2nd', '3rd']

// (2) Fan-favourite voting. Every team casts a ranked top-3 ballot for BOTH categories
// (Beginner + Open). Self-vote is impossible by construction — a team never appears in its
// own category list as a candidate it can pick over itself; the server re-checks too.
export default function FanFavCard({ team }: { team: Team }) {
  const teams = useQuery(api.teams.list)
  const ballots = useQuery(api.fanVotes.getMyBallots, { teamId: team._id })

  if (teams === undefined || ballots === undefined) {
    return (
      <section className="mt-4 bh-card p-3">
        <p className="text-xs text-bh-dim bh-display">Loading fan-favourites…</p>
      </section>
    )
  }

  return (
    <section className="mt-4 bh-card p-3">
      <h3 className="bh-display text-sm font-bold text-white mb-1">Fan favourites</h3>
      <p className="text-xs text-bh-dim mb-3">
        Vote for your top 3 teams in <strong className="text-white">each</strong> category. You can change your picks any
        time — voting stays open the whole event.
      </p>
      <div className="space-y-4">
        <CategoryBallot team={team} teams={teams} category="cat1" initial={ballots.cat1 as TeamId[]} />
        <CategoryBallot team={team} teams={teams} category="cat2" initial={ballots.cat2 as TeamId[]} />
      </div>
    </section>
  )
}

function CategoryBallot({
  team,
  teams,
  category,
  initial,
}: {
  team: Team
  teams: Team[]
  category: TeamCategory
  initial: TeamId[]
}) {
  const setBallot = useMutation(api.fanVotes.setBallot)
  const [picks, setPicks] = useState<string[]>([initial[0] ?? '', initial[1] ?? '', initial[2] ?? ''])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const candidates = teams
    .filter((t) => effectiveCategory(t) === category && t._id !== team._id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const commit = async (next: string[]) => {
    setPicks(next)
    setError(null)
    setSaved(false)
    const ranked = next.filter((id): id is TeamId => id !== '')
    try {
      await setBallot({ teamId: team._id, category, rankedTeamIds: ranked })
      setSaved(true)
    } catch (e) {
      setError(friendlyError(e, 'Vote failed.'))
    }
  }

  if (candidates.length === 0) {
    return (
      <div>
        <h4 className="bh-display text-xs tracking-wider text-bh-lime mb-1">{categoryLabel(category)}</h4>
        <p className="text-xs text-bh-dim">No other teams in this category yet.</p>
      </div>
    )
  }

  return (
    <div>
      <h4 className="bh-display text-xs tracking-wider text-bh-lime mb-1">{categoryLabel(category)}</h4>
      <div className="space-y-2">
        {[0, 1, 2].map((slot) => {
          const chosenElsewhere = new Set(picks.filter((_, i) => i !== slot && picks[i] !== ''))
          return (
            <div key={slot} className="flex items-center gap-2">
              <span className="bh-display w-7 text-xs text-bh-dim">{RANK_LABELS[slot]}</span>
              <select
                value={picks[slot]}
                onChange={(e) => {
                  const next = [...picks]
                  next[slot] = e.target.value
                  void commit(next)
                }}
                className="flex-1 rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white focus:ring-bh-lime focus:outline-none"
              >
                <option value="" className="bg-bh-panel">
                  —
                </option>
                {candidates.map((t) => (
                  <option key={t._id} value={t._id} disabled={chosenElsewhere.has(t._id)} className="bg-bh-panel">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
      {error && <p className="text-xs text-bh-magenta mt-1">{error}</p>}
      {saved && !error && <p className="text-xs text-bh-lime mt-1 bh-display tracking-wider">Saved ✓</p>}
    </div>
  )
}
