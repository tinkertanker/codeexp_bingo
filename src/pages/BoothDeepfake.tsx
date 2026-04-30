import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { submitBoothQr } from '../lib/submit'
import { supabase, type BingoSquare, type Team } from '../lib/supabase'
import { loadTeamToken } from '../lib/token'

type Phase = 'init' | 'no_token' | 'submitting' | 'already_done' | 'done' | 'error'

export default function BoothDeepfake() {
  const [phase, setPhase] = useState<Phase>('init')
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = loadTeamToken()
      if (!token) {
        setPhase('no_token')
        return
      }
      const teamRes = await supabase.from('teams').select('*').eq('token', token).maybeSingle()
      if (cancelled) return
      if (teamRes.error || !teamRes.data) {
        setPhase('no_token')
        return
      }
      const t = teamRes.data as Team
      setTeam(t)

      const sqRes = await supabase
        .from('bingo_squares')
        .select('*')
        .eq('verification_kind', 'booth_qr')
        .maybeSingle()
      if (cancelled) return
      if (sqRes.error || !sqRes.data) {
        setError(sqRes.error?.message ?? 'Booth square not configured.')
        setPhase('error')
        return
      }
      const square = sqRes.data as BingoSquare

      const existingRes = await supabase
        .from('square_completions')
        .select('status')
        .eq('team_id', t.id)
        .eq('square_id', square.id)
        .maybeSingle()
      if (cancelled) return
      if (existingRes.data?.status === 'approved') {
        setPhase('already_done')
        return
      }

      setPhase('submitting')
      const r = await submitBoothQr(t, square)
      if (cancelled) return
      if (!r.ok) {
        setError(r.reason)
        setPhase('error')
        return
      }
      setPhase('done')
      setTimeout(() => navigate(`/t/${t.token}`, { replace: true }), 1500)
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="bh-display text-3xl font-extrabold mb-4 text-white">
        DEEPFAKE <span className="text-bh-magenta">BOOTH</span>
      </h1>
      {phase === 'init' || phase === 'submitting' ? (
        <p className="text-bh-dim bh-display tracking-wider text-sm animate-pulse">Marking your bingo square…</p>
      ) : phase === 'no_token' ? (
        <div className="bh-card p-6 max-w-md">
          <p className="text-sm text-white/80 mb-3">
            You need to be logged in as your team to claim the booth visit. Open your team's magic link first, then come back to this poster.
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
              Back to bingo card
            </Link>
          )}
        </div>
      ) : phase === 'done' ? (
        <div className="bh-card p-6 max-w-md text-center">
          <p className="bh-display text-bh-lime text-2xl font-extrabold drop-shadow-[0_0_12px_rgba(166,251,0,0.65)]">Booth visit claimed!</p>
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
