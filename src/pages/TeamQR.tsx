import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Link, useParams } from 'react-router-dom'
import { useTeam } from '../hooks/useTeam'
import { teamScanLink } from '../lib/qr'

export default function TeamQR() {
  const { token } = useParams()
  const { status, data } = useTeam(token)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (status !== 'ok' || !data || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, teamScanLink(data.team.token), {
      width: 320,
      margin: 1,
      color: { dark: '#000000', light: '#A6FB00' },
    }).catch(() => {})
  }, [status, data])

  if (status !== 'ok' || !data) {
    return <div className="p-6 text-bh-dim bh-display text-xs">Loading…</div>
  }

  const swatch =
    data.team.colour === 'red' ? 'bg-team-red shadow-neon-magenta' :
    data.team.colour === 'blue' ? 'bg-team-blue shadow-neon-cyan' :
    data.team.colour === 'green' ? 'bg-team-green shadow-neon-lime' :
    data.team.colour === 'purple' ? 'bg-team-purple shadow-neon-purple' :
    'bg-team-yellow'
  const groupLabel =
    data.team.colour === 'red' ? 'Magenta group' :
    data.team.colour === 'blue' ? 'Cyan group' :
    data.team.colour === 'green' ? 'Lime group' :
    data.team.colour === 'purple' ? 'Purple group' :
    'Yellow group'

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={['w-6 h-6 rounded-full ring-2 ring-black/40', swatch].join(' ')} />
        <h1 className="bh-display text-2xl font-bold text-white">{data.team.name}</h1>
      </div>
      <p className="bh-display text-[0.7rem] text-bh-dim mb-6 tracking-widest">{groupLabel}</p>
      <div className="relative p-2 rounded-md ring-1 ring-bh-lime/40 shadow-neon-lime bg-bh-lime">
        <canvas ref={canvasRef} className="block rounded" />
      </div>
      <p className="text-xs text-bh-dim mt-4 text-center max-w-xs">
        Show this QR to other teams so they can scan it in the bingo app to complete squares.
      </p>
      <Link to={`/t/${data.team.token}`} className="bh-btn-primary mt-6 text-sm">
        Back to bingo card
      </Link>
    </div>
  )
}
