import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import QRCode from 'qrcode'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'

function claimUrl(claimSlug: string): string {
  if (typeof window === 'undefined') return `/claim/${claimSlug}`
  return `${window.location.origin}/claim/${claimSlug}`
}

export default function ClaimQrDisplay() {
  const { claimSlug = '' } = useParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const square = useQuery(api.squares.getByClaimSlug, claimSlug ? { claimSlug } : 'skip')
  const url = claimUrl(claimSlug)

  useEffect(() => {
    if (!claimSlug || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: 360,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    }).catch(() => {})
  }, [claimSlug, url])

  const title = square?.title ?? (claimSlug === 'deepfake' ? 'Deepfake booth' : 'Event claim')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-black print:bg-white">
      <div className="w-full max-w-md text-center">
        <p className="bh-display text-xs tracking-[0.25em] text-black/60 mb-2">CODE_EXP 2026</p>
        <h1 className="bh-display text-3xl font-extrabold mb-5">{title.toUpperCase()}</h1>
        <div className="inline-block p-3 rounded-md ring-1 ring-black/15 bg-white">
          <canvas ref={canvasRef} className="block rounded" />
        </div>
        <p className="mt-4 text-sm break-all text-black/70">{url}</p>
        {square === null && (
          <p className="mt-3 text-sm text-red-700">This claim slug is not configured in Convex yet.</p>
        )}
        <Link to={`/claim/${claimSlug}`} className="inline-flex mt-6 px-3 py-2 rounded-md bg-black text-white text-sm">
          Test claim page
        </Link>
      </div>
    </div>
  )
}
