import { useEffect, useState } from 'react'
import { useConvex, useMutation } from 'convex/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { loadTeamToken } from '../lib/token'
import type { BingoSquare, Team } from '../lib/types'

type Phase = 'init' | 'no_token' | 'submitting' | 'already_done' | 'done' | 'error'

export default function ClaimQr({ fixedClaimSlug }: { fixedClaimSlug?: string }) {
  const { claimSlug: routeClaimSlug } = useParams()
  const claimSlug = fixedClaimSlug ?? routeClaimSlug ?? ''
  const [phase, setPhase] = useState<Phase>('init')
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [square, setSquare] = useState<BingoSquare | null>(null)
  const navigate = useNavigate()
  const convex = useConvex()
  const submitClaimQr = useMutation(api.completions.submitClaimQr)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = loadTeamToken()
      if (!token) {
        setPhase('no_token')
        return
      }
      const t = await convex.query(api.teams.getByToken, { token })
      if (cancelled) return
      if (!t) {
        setPhase('no_token')
        return
      }
      setTeam(t)

      const sq = await convex.query(api.squares.getByClaimSlug, { claimSlug })
      if (cancelled) return
      if (!sq) {
        setError('Claim QR is not configured.')
        setPhase('error')
        return
      }
      setSquare(sq)

      const completions = await convex.query(api.completions.listForTeam, { teamId: t._id })
      if (cancelled) return
      const existing = completions.find((c) => c.squareId === sq._id)
      if (existing?.status === 'approved') {
        setPhase('already_done')
        return
      }

      setPhase('submitting')
      try {
        await submitClaimQr({ teamId: t._id, squareId: sq._id })
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Claim failed.')
        setPhase('error')
        return
      }
      if (cancelled) return
      setPhase('done')
      setTimeout(() => navigate(`/t/${t.token}`, { replace: true }), 1500)
    })()
    return () => {
      cancelled = true
    }
  }, [claimSlug, convex, navigate, submitClaimQr])

  const title = square?.title ?? (claimSlug === 'deepfake' ? 'Deepfake booth' : 'Event claim')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="bh-display text-3xl font-extrabold mb-4 text-white text-center">
        {title.toUpperCase()}
      </h1>
      {phase === 'init' || phase === 'submitting' ? (
        <p className="text-bh-dim bh-display tracking-wider text-sm animate-pulse">Marking your square…</p>
      ) : phase === 'no_token' ? (
        <div className="bh-card p-6 max-w-md">
          <p className="text-sm text-white/80 mb-3">
            You need to be logged in as your team to claim this. Open your team's magic link first, then scan this QR again.
          </p>
          <Link to="/" className="bh-btn-primary w-full">
            Open team home
          </Link>
        </div>
      ) : phase === 'already_done' ? (
        <div className="bh-card p-6 max-w-md text-center">
          <p className="bh-display text-bh-lime text-lg font-bold">Already claimed ✓</p>
          {team && (
            <Link to={`/t/${team.token}`} className="bh-btn-primary mt-4 text-sm">
              Back to card
            </Link>
          )}
        </div>
      ) : phase === 'done' ? (
        <div className="bh-card p-6 max-w-md text-center">
          <p className="bh-display text-bh-lime text-2xl font-extrabold drop-shadow-[0_0_12px_rgba(166,251,0,0.65)]">Claimed!</p>
          <p className="text-sm text-bh-dim mt-2">Redirecting…</p>
        </div>
      ) : (
        <div className="bh-card p-6 max-w-md">
          <p className="text-bh-magenta text-sm">{error ?? 'Something went wrong.'}</p>
        </div>
      )}
    </div>
  )
}
