import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import { teamMagicLink } from '../../lib/qr'
import type { Team, TeamCategory, TeamColour, TeamId } from '../../lib/types'

const COLOURS: TeamColour[] = ['red', 'blue', 'green', 'yellow']
const CATEGORIES: TeamCategory[] = ['cat1', 'cat2']

export default function TeamsManage() {
  return <AdminLayout>{(creds) => <Manage mentorName={creds.name} passcode={creds.passcode} />}</AdminLayout>
}

function Manage({ mentorName, passcode }: { mentorName: string; passcode: string }) {
  const teams = useQuery(api.teams.list)
  const createTeam = useMutation(api.teams.create)
  const regenerateToken = useMutation(api.teams.regenerateToken)
  const setCategory = useMutation(api.teams.setCategory)

  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColour, setNewColour] = useState<TeamColour>('red')
  const [newCategory, setNewCategory] = useState<TeamCategory>('cat1')
  const [creating, setCreating] = useState(false)
  const [copyId, setCopyId] = useState<TeamId | null>(null)

  const sortedTeams = teams
    ? [...teams].sort(
        (a, b) =>
          a.colour.localeCompare(b.colour) ||
          (a.category ?? 'cat1').localeCompare(b.category ?? 'cat1') ||
          a.name.localeCompare(b.name),
      )
    : []

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      await createTeam({
        passcode,
        mentorName,
        name: newName.trim(),
        colour: newColour,
        category: newCategory,
      })
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed.')
    }
    setCreating(false)
  }

  const regen = async (team: Team) => {
    if (!window.confirm(`Regenerate magic link for ${team.name}? The old link will stop working.`)) return
    try {
      await regenerateToken({ passcode, mentorName, teamId: team._id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regenerate failed.')
    }
  }

  const changeCategory = async (team: Team, category: TeamCategory) => {
    try {
      await setCategory({ passcode, mentorName, teamId: team._id, category })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Set category failed.')
    }
  }

  const copyLink = async (team: Team) => {
    const url = teamMagicLink(team.token)
    try {
      await navigator.clipboard.writeText(url)
      setCopyId(team._id)
      setTimeout(() => setCopyId((c) => (c === team._id ? null : c)), 1500)
    } catch {
      window.prompt('Copy this magic link:', url)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="bh-display text-xl font-bold mb-2 text-white">Add a team</h2>
        <form onSubmit={create} className="flex flex-wrap items-end gap-2 bh-card p-3">
          <label className="block flex-1 min-w-[200px]">
            <span className="bh-display text-[0.65rem] tracking-wider text-bh-dim">Team name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white focus:ring-bh-lime focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="bh-display text-[0.65rem] tracking-wider text-bh-dim">Colour group</span>
            <select
              value={newColour}
              onChange={(e) => setNewColour(e.target.value as TeamColour)}
              className="mt-1 rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white capitalize focus:ring-bh-lime focus:outline-none"
            >
              {COLOURS.map((c) => (
                <option key={c} value={c} className="capitalize bg-bh-panel">{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="bh-display text-[0.65rem] tracking-wider text-bh-dim">Category</span>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as TeamCategory)}
              className="mt-1 rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white focus:ring-bh-lime focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-bh-panel">{c}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={creating} className="bh-btn-ghost text-xs disabled:opacity-50">
            {creating ? 'Adding…' : 'Add team'}
          </button>
        </form>
        {error && <p className="text-sm text-bh-magenta mt-2">{error}</p>}
      </section>

      <section>
        <h2 className="bh-display text-xl font-bold mb-2 text-white">{sortedTeams.length} teams</h2>
        {teams === undefined && <p className="text-sm text-bh-dim bh-display">Loading…</p>}
        <ul className="space-y-2">
          {sortedTeams.map((t) => (
            <li key={t._id} className="bh-card p-3 flex items-center gap-3 flex-wrap">
              <span className={['inline-block w-4 h-4 rounded-full', `bg-team-${t.colour}`].join(' ')} />
              <div className="flex-1 min-w-0">
                <div className="bh-display text-sm font-bold truncate text-white">
                  {t.name}
                  <span className="ml-2 bh-display text-[0.6rem] tracking-widest text-bh-lime">
                    {t.category ?? 'cat1'}
                  </span>
                </div>
                <div className="text-xs text-bh-dim truncate font-mono">{teamMagicLink(t.token)}</div>
              </div>
              <select
                value={t.category ?? 'cat1'}
                onChange={(e) => changeCategory(t, e.target.value as TeamCategory)}
                className="rounded-md ring-1 ring-bh-line bg-black/40 px-2 py-1 text-xs text-white focus:ring-bh-lime focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-bh-panel">{c}</option>
                ))}
              </select>
              <button onClick={() => copyLink(t)} className="bh-display px-2 py-1 rounded text-[0.65rem] tracking-wider ring-1 ring-bh-line text-bh-dim hover:text-bh-lime hover:ring-bh-lime/40">
                {copyId === t._id ? 'COPIED!' : 'Copy link'}
              </button>
              <button onClick={() => regen(t)} className="bh-display px-2 py-1 rounded text-[0.65rem] tracking-wider ring-1 ring-bh-line text-bh-dim hover:text-bh-magenta hover:ring-bh-magenta/40">
                Regenerate
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
