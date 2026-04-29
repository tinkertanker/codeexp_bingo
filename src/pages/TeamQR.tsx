import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Link, useParams } from 'react-router-dom'
import { useTeam } from '../hooks/useTeam'
import { teamMagicLink } from '../lib/qr'

export default function TeamQR() {
  const { token } = useParams()
  const { status, data } = useTeam(token)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (status !== 'ok' || !data || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, teamMagicLink(data.team.token), { width: 320, margin: 1 }).catch(() => {})
  }, [status, data])

  if (status !== 'ok' || !data) {
    return <div className="p-6 text-slate-500">Loading…</div>
  }

  const swatch =
    data.team.colour === 'red' ? 'bg-team-red' :
    data.team.colour === 'blue' ? 'bg-team-blue' :
    data.team.colour === 'green' ? 'bg-team-green' :
    'bg-team-yellow'

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-slate-50">
      <div className="flex items-center gap-3 mb-4">
        <div className={['w-6 h-6 rounded-full ring-2 ring-white shadow', swatch].join(' ')} />
        <h1 className="text-2xl font-bold">{data.team.name}</h1>
      </div>
      <p className="text-xs text-slate-500 mb-6 uppercase tracking-wide capitalize">{data.team.colour} group</p>
      <canvas ref={canvasRef} className="rounded-lg shadow-lg bg-white p-3" />
      <p className="text-xs text-slate-600 mt-4 text-center max-w-xs">
        Show this QR to other teams to let them complete bingo squares with your team. Scanning it on a fresh device
        also logs you in here.
      </p>
      <Link to={`/t/${data.team.token}`} className="mt-6 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">
        Back to bingo card
      </Link>
    </div>
  )
}
