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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-fuchsia-50 to-fuchsia-200">
      <h1 className="text-3xl font-bold mb-2">Deepfake booth</h1>
      {phase === 'init' || phase === 'submitting' ? (
        <p className="text-slate-600">Marking your bingo square…</p>
      ) : phase === 'no_token' ? (
        <div className="bg-white rounded-xl shadow p-6 max-w-md">
          <p className="text-sm text-slate-700 mb-3">
            You need to be logged in as your team to claim the booth visit. Open your team's magic link first, then come back to this poster.
          </p>
          <Link to="/" className="block text-center w-full py-3 rounded-lg bg-slate-800 text-white font-medium">
            Open team home
          </Link>
        </div>
      ) : phase === 'already_done' ? (
        <div className="bg-white rounded-xl shadow p-6 max-w-md text-center">
          <p className="text-emerald-700 text-lg font-semibold">Already claimed ✓</p>
          {team && (
            <Link to={`/t/${team.token}`} className="mt-4 inline-block px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">
              Back to bingo card
            </Link>
          )}
        </div>
      ) : phase === 'done' ? (
        <div className="bg-white rounded-xl shadow p-6 max-w-md text-center">
          <p className="text-emerald-700 text-2xl font-bold">Booth visit claimed!</p>
          <p className="text-sm text-slate-500 mt-2">Redirecting…</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-6 max-w-md">
          <p className="text-rose-600 text-sm">{error ?? 'Something went wrong.'}</p>
        </div>
      )}
    </div>
  )
}
