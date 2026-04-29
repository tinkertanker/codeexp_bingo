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
        <h2 className="text-xl font-semibold mb-2">Add a team</h2>
        <form onSubmit={create} className="flex flex-wrap items-end gap-2 bg-white p-3 rounded-lg ring-1 ring-slate-200">
          <label className="block flex-1 min-w-[200px]">
            <span className="text-xs text-slate-500">Team name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full rounded-lg ring-1 ring-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Colour group</span>
            <select
              value={newColour}
              onChange={(e) => setNewColour(e.target.value as TeamColour)}
              className="mt-1 rounded-lg ring-1 ring-slate-300 px-3 py-2 text-sm capitalize"
            >
              {COLOURS.map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={creating} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50">
            {creating ? 'Adding…' : 'Add team'}
          </button>
        </form>
        {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">{teams.length} teams</h2>
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        <ul className="space-y-2">
          {teams.map((t) => (
            <li key={t.id} className="bg-white rounded-lg ring-1 ring-slate-200 p-3 flex items-center gap-3">
              <span className={['inline-block w-4 h-4 rounded-full', `bg-team-${t.colour}`].join(' ')} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{t.name}</div>
                <div className="text-xs text-slate-500 truncate">{teamMagicLink(t.token)}</div>
              </div>
              <button onClick={() => copyLink(t)} className="px-2 py-1 rounded text-xs ring-1 ring-slate-200 hover:bg-slate-50">
                {copyId === t.id ? 'Copied!' : 'Copy link'}
              </button>
              <button onClick={() => regen(t)} className="px-2 py-1 rounded text-xs ring-1 ring-slate-200 hover:bg-slate-50">
                Regenerate
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
