import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { checkPasscode } from '../../lib/admin'
import { saveAdminCreds } from '../../lib/token'

export default function AdminLogin() {
  const [name, setName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Type your first name so we can audit your actions.')
    if (!checkPasscode(passcode)) return setError('Incorrect passcode.')
    saveAdminCreds(name.trim(), passcode.trim())
    const from = (location.state as { from?: string } | null)?.from
    navigate(from && from.startsWith('/admin/') ? from : '/admin/queue', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="bg-white rounded-xl shadow p-6 w-full max-w-sm space-y-3">
        <h1 className="text-xl font-bold">Mentor / admin</h1>
        <p className="text-xs text-slate-500">
          Your name is recorded against every approval / rejection — that's the audit trail.
        </p>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg ring-1 ring-slate-300 px-3 py-2 text-sm"
            autoCapitalize="words"
            autoComplete="given-name"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Passcode</span>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="mt-1 w-full rounded-lg ring-1 ring-slate-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <button type="submit" className="w-full py-3 rounded-lg bg-slate-800 text-white font-medium">
          Sign in
        </button>
      </form>
    </div>
  )
}
