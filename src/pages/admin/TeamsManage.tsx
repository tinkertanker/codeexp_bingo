import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { generateTeamToken, logMentorAction } from '../../lib/admin'
import { teamMagicLink } from '../../lib/qr'
import { supabase, type Team, type TeamColour } from '../../lib/supabase'

const COLOURS: TeamColour[] = ['red', 'blue', 'green', 'yellow']

export default function TeamsManage() {
  return <AdminLayout>{(creds) => <Manage mentorName={creds.name} />}</AdminLayout>
}

function Manage({ mentorName }: { mentorName: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColour, setNewColour] = useState<TeamColour>('red')
  const [creating, setCreating] = useState(false)
  const [copyId, setCopyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('teams').select('*').order('colour').order('name')
    if (error) setError(error.message)
    else setTeams((data ?? []) as Team[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    const token = generateTeamToken()
    const { data, error } = await supabase
      .from('teams')
      .insert({ name: newName.trim(), colour: newColour, token })
      .select('*')
      .single()
    if (error) {
      setError(error.message)
      setCreating(false)
      return
    }
    await logMentorAction(mentorName, 'create_team', null, { team_id: data.id, colour: newColour })
    setNewName('')
    setCreating(false)
    load()
  }

  const regen = async (team: Team) => {
    if (!window.confirm(`Regenerate magic link for ${team.name}? The old link will stop working.`)) return
    const token = generateTeamToken()
    const { error } = await supabase.from('teams').update({ token }).eq('id', team.id)
    if (error) {
      setError(error.message)
      return
    }
    await logMentorAction(mentorName, 'regen_token', null, { team_id: team.id })
    load()
  }

  const copyLink = async (team: Team) => {
    const url = teamMagicLink(team.token)
    try {
      await navigator.clipboard.writeText(url)
      setCopyId(team.id)
      setTimeout(() => setCopyId((c) => (c === team.id ? null : c)), 1500)
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
          <button type="submit" disabled={creating} className="bh-btn-ghost text-xs disabled:opacity-50">
            {creating ? 'Adding…' : 'Add team'}
          </button>
        </form>
        {error && <p className="text-sm text-bh-magenta mt-2">{error}</p>}
      </section>

      <section>
        <h2 className="bh-display text-xl font-bold mb-2 text-white">{teams.length} teams</h2>
        {loading && <p className="text-sm text-bh-dim bh-display">Loading…</p>}
        <ul className="space-y-2">
          {teams.map((t) => (
            <li key={t.id} className="bh-card p-3 flex items-center gap-3">
              <span className={['inline-block w-4 h-4 rounded-full', `bg-team-${t.colour}`].join(' ')} />
              <div className="flex-1 min-w-0">
                <div className="bh-display text-sm font-bold truncate text-white">{t.name}</div>
                <div className="text-xs text-bh-dim truncate font-mono">{teamMagicLink(t.token)}</div>
              </div>
              <button onClick={() => copyLink(t)} className="bh-display px-2 py-1 rounded text-[0.65rem] tracking-wider ring-1 ring-bh-line text-bh-dim hover:text-bh-lime hover:ring-bh-lime/40">
                {copyId === t.id ? 'COPIED!' : 'Copy link'}
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
