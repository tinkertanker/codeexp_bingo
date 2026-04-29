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

  if (creds === 'loading') return <div className="p-6 text-slate-500">…</div>
  if (!creds) return null

  const organiser = isOrganiser(creds.name)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-base font-bold">Bingo admin</h1>
          <nav className="flex items-center gap-3 text-sm">
            <NavTab to="/admin/queue" label="Queue" />
            <NavTab to="/admin/teams" label="Teams" />
            <NavTab to="/admin/game" label="Game" />
            {organiser && <NavTab to="/admin/draw" label="Draw" />}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span>
              {creds.name}
              {organiser ? ' · organiser' : ''}
            </span>
            <button
              onClick={() => {
                clearAdminCreds()
                navigate('/admin', { replace: true })
              }}
              className="px-2 py-1 rounded ring-1 ring-slate-200 hover:bg-slate-100"
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
        'px-3 py-1.5 rounded-md',
        active ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}
