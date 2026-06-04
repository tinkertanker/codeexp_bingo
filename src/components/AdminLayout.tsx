import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isOrganiser, requireAdmin, type AdminCreds } from '../lib/admin'
import { clearAdminCreds } from '../lib/token'

export type AdminLayoutProps = {
  children: (creds: AdminCreds) => React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [creds, setCreds] = useState<AdminCreds | null | 'loading'>('loading')

  useEffect(() => {
    const c = requireAdmin()
    if (!c) {
      navigate('/admin', { replace: true, state: { from: location.pathname } })
      return
    }
    setCreds(c)
  }, [navigate, location.pathname])

  if (creds === 'loading') return <div className="p-6 text-bh-dim bh-display text-xs">…</div>
  if (!creds) return null

  const organiser = isOrganiser(creds.name)

  return (
    <div className="min-h-screen">
      <header className="bg-bh-surface/80 backdrop-blur border-b border-bh-line">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <img src="/code-exp-logo.png" alt="" className="w-7 h-7" />
          <h1 className="bh-display text-base font-bold text-white">
            CODE_EXP <span className="text-bh-lime">ADMIN</span>
          </h1>
          <nav className="flex items-center gap-1 text-sm flex-wrap">
            <NavTab to="/admin/queue" label="Queue" />
            <NavTab to="/admin/teams" label="Teams" />
            <NavTab to="/admin/game" label="Game" />
            <NavTab to="/admin/fanfavs" label="Fan favs" />
            <NavTab to="/admin/submissions" label="Submissions" />
            <NavTab to="/admin/photos" label="Photos" />
            {organiser && <NavTab to="/admin/draw" label="Draw" />}
            {organiser && <NavTab to="/admin/round2" label="Round 2" />}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs text-bh-dim">
            <span className="bh-display tracking-wider">
              {creds.name}
              {organiser ? <span className="text-bh-lime"> · ORGANISER</span> : ''}
            </span>
            <button
              onClick={() => {
                clearAdminCreds()
                navigate('/admin', { replace: true })
              }}
              className="px-2 py-1 rounded ring-1 ring-bh-line hover:bg-bh-panel text-bh-dim"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children(creds)}</main>
    </div>
  )
}

function NavTab({ to, label }: { to: string; label: string }) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <Link
      to={to}
      className={[
        'bh-display px-3 py-1.5 rounded text-xs tracking-wider transition',
        active
          ? 'bg-bh-lime text-black font-bold shadow-neon-lime'
          : 'text-bh-dim hover:text-white hover:bg-bh-panel',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}
