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
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="relative bh-card p-6 w-full max-w-sm space-y-3 overflow-hidden">
        <div className="absolute -top-1 left-6 h-1 w-16 bg-bh-lime" />
        <div className="absolute -bottom-1 right-6 h-1 w-12 bg-bh-magenta" />
        <div className="flex items-center gap-3">
          <img src="/code-exp-logo.png" alt="" className="w-8 h-8" />
          <h1 className="bh-display text-xl font-bold text-white">Mentor / Admin</h1>
        </div>
        <p className="text-xs text-bh-dim">
          Your name is recorded against every approval / rejection — that's the audit trail.
        </p>
        <label className="block">
          <span className="bh-display text-[0.65rem] tracking-wider text-bh-dim">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white placeholder:text-bh-dim focus:ring-bh-lime focus:outline-none"
            autoCapitalize="words"
            autoComplete="given-name"
          />
        </label>
        <label className="block">
          <span className="bh-display text-[0.65rem] tracking-wider text-bh-dim">Passcode</span>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="mt-1 w-full rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white focus:ring-bh-lime focus:outline-none"
          />
        </label>
        {error && <div className="text-sm text-bh-magenta">{error}</div>}
        <button type="submit" className="bh-btn-primary w-full">
          Sign in
        </button>
      </form>
    </div>
  )
}
