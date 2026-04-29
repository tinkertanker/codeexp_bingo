import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PhotoCapture from '../components/PhotoCapture'
import QRScanner from '../components/QRScanner'
import { useTeam } from '../hooks/useTeam'
import { parseTeamToken } from '../lib/qr'
import {
  submitIgUrl,
  submitPhotoAuto,
  submitPhotoMentor,
  submitPhotoWithTeam,
  submitScanTeam,
  submitScanTeamWithAnswer,
  type SubmitResult,
} from '../lib/submit'
import { supabase, type BingoSquare, type Team } from '../lib/supabase'

export default function SquareDetail() {
  const { token, position } = useParams()
  const { status, data, refresh } = useTeam(token)
  const navigate = useNavigate()

  if (status === 'loading') return <div className="p-6 text-slate-500">Loading…</div>
  if (status !== 'ok' || !data) return <div className="p-6 text-rose-600">Team not found.</div>

  const square = data.squares.find((s) => s.position === Number(position))
  if (!square) return <div className="p-6 text-rose-600">Square not found.</div>

  const existing = data.completions.find((c) => c.square_id === square.id)
  const completed = existing?.status === 'approved'
  const pending = existing?.status === 'pending'

  const finishSubmit = async (resultPromise: Promise<SubmitResult>): Promise<{ ok: boolean; reason?: string }> => {
    const r = await resultPromise
    if (!r.ok) return { ok: false, reason: r.reason }
    refresh()
    navigate(`/t/${data.team.token}`, { replace: true })
    return { ok: true }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        <Link to={`/t/${data.team.token}`} className="text-sm text-slate-500 hover:text-slate-800">
          ← Back
        </Link>
        <h1 className="mt-2 text-xl font-bold">{square.title}</h1>
        <p className="text-sm text-slate-600 mb-4">{square.description}</p>

        {completed && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm mb-4">Already completed. ✓</div>
        )}
        {pending && (
          <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm mb-4">
            Waiting for a mentor to approve. You can resubmit if you'd like to replace your evidence.
          </div>
        )}

        {!data.gameOpen && !completed && (
          <div className="p-3 rounded-lg bg-amber-100 text-amber-900 text-sm mb-4">
            The bingo is paused — submissions are locked. Try again once the game reopens.
          </div>
        )}
        {!completed && data.gameOpen && (
          <Verification team={data.team} square={square} onSubmit={finishSubmit} />
        )}
      </div>
    </div>
  )
}

type VerifProps = {
  team: Team
  square: BingoSquare
  onSubmit: (resultPromise: Promise<SubmitResult>) => Promise<{ ok: boolean; reason?: string }>
}

function Verification({ team, square, onSubmit }: VerifProps) {
  switch (square.verification_kind) {
    case 'scan_team':
      return <ScanTeamFlow team={team} square={square} onSubmit={onSubmit} />
    case 'scan_team_with_answer':
      return <ScanTeamWithAnswerFlow team={team} square={square} onSubmit={onSubmit} />
    case 'photo_with_team':
      return <PhotoWithTeamFlow team={team} square={square} onSubmit={onSubmit} />
    case 'photo_auto':
      return <SimplePhotoFlow team={team} square={square} onSubmit={onSubmit} kind="auto" />
    case 'photo_mentor':
      return <SimplePhotoFlow team={team} square={square} onSubmit={onSubmit} kind="mentor" />
    case 'ig_url_mentor':
      return <IgUrlFlow team={team} square={square} onSubmit={onSubmit} />
    case 'booth_qr':
      return <BoothQrHint />
  }
}

async function lookupTeamByToken(rawScan: string): Promise<{ ok: true; team: Team } | { ok: false; reason: string }> {
  const tk = parseTeamToken(rawScan)
  if (!tk) return { ok: false, reason: "That doesn't look like a team QR." }
  const { data, error } = await supabase.from('teams').select('*').eq('token', tk).maybeSingle()
  if (error) return { ok: false, reason: error.message }
  if (!data) return { ok: false, reason: 'No team found for that QR.' }
  return { ok: true, team: data as Team }
}

function ScanTeamFlow({ team, square, onSubmit }: VerifProps) {
  const [scanning, setScanning] = useState(false)
  const [scannedTeam, setScannedTeam] = useState<Team | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onScan = async (text: string) => {
    if (submitting || scannedTeam) return
    setScanning(false)
    const r = await lookupTeamByToken(text)
    if (!r.ok) return setError(r.reason)
    setError(null)
    setScannedTeam(r.team)
  }

  const submit = async () => {
    if (!scannedTeam) return
    setSubmitting(true)
    setError(null)
    const result = await onSubmit(submitScanTeam(team, square, scannedTeam))
    if (!result.ok) {
      setError(result.reason ?? 'Submission failed.')
      setSubmitting(false)
    }
  }

  if (scannedTeam) {
    return (
      <div className="space-y-3">
        <ScannedTeamCard scannedTeam={scannedTeam} />
        <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Confirm completion'}
        </button>
        <button onClick={() => setScannedTeam(null)} disabled={submitting} className="w-full py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-300 text-sm">
          Scan again
        </button>
        {error && <div className="text-sm text-rose-600">{error}</div>}
      </div>
    )
  }
  if (scanning) {
    return (
      <div className="space-y-3">
        <QRScanner onScan={onScan} />
        <button onClick={() => setScanning(false)} className="w-full py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-300 text-sm">Cancel</button>
        {error && <div className="text-sm text-rose-600">{error}</div>}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <button onClick={() => setScanning(true)} className="w-full py-3 rounded-lg bg-slate-800 text-white font-semibold">
        Scan another team's QR
      </button>
      <p className="text-xs text-slate-500">Tip: you can scan your own team's QR if you're claiming yourself.</p>
      {error && <div className="text-sm text-rose-600">{error}</div>}
    </div>
  )
}

function ScanTeamWithAnswerFlow({ team, square, onSubmit }: VerifProps) {
  const [scanning, setScanning] = useState(false)
  const [scannedTeam, setScannedTeam] = useState<Team | null>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onScan = async (text: string) => {
    if (submitting || scannedTeam) return
    setScanning(false)
    const r = await lookupTeamByToken(text)
    if (!r.ok) return setError(r.reason)
    if (r.team.id === team.id) {
      setError("Blue squares need to be completed with another team — you can't scan yourself here.")
      return
    }
    setError(null)
    setScannedTeam(r.team)
  }

  const submit = async () => {
    if (!scannedTeam) return
    if (answer.trim().length === 0) {
      setError("Please type the team's answer briefly.")
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await onSubmit(submitScanTeamWithAnswer(team, square, scannedTeam, answer))
    if (!result.ok) {
      setError(result.reason ?? 'Submission failed.')
      setSubmitting(false)
    }
  }

  if (scannedTeam) {
    return (
      <div className="space-y-3">
        <ScannedTeamCard scannedTeam={scannedTeam} />
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Their answer (short)</span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value.slice(0, 280))}
            rows={3}
            placeholder="Type a quick summary of what they said…"
            className="mt-1 w-full rounded-lg ring-1 ring-slate-300 px-3 py-2 text-sm"
          />
          <span className="text-xs text-slate-400">{answer.length}/280</span>
        </label>
        <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Confirm completion'}
        </button>
        <button onClick={() => setScannedTeam(null)} disabled={submitting} className="w-full py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-300 text-sm">
          Scan again
        </button>
        {error && <div className="text-sm text-rose-600">{error}</div>}
      </div>
    )
  }
  if (scanning) {
    return (
      <div className="space-y-3">
        <QRScanner onScan={onScan} />
        <button onClick={() => setScanning(false)} className="w-full py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-300 text-sm">Cancel</button>
        {error && <div className="text-sm text-rose-600">{error}</div>}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <button onClick={() => setScanning(true)} className="w-full py-3 rounded-lg bg-slate-800 text-white font-semibold">
        Scan another team's QR
      </button>
      <p className="text-xs text-slate-500">
        Across the 4 blue squares, you must use teams of <strong>4 different colours</strong>.
      </p>
      {error && <div className="text-sm text-rose-600">{error}</div>}
    </div>
  )
}

function PhotoWithTeamFlow({ team, square, onSubmit }: VerifProps) {
  const [scanning, setScanning] = useState(false)
  const [scannedTeam, setScannedTeam] = useState<Team | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onScan = async (text: string) => {
    if (submitting || scannedTeam) return
    setScanning(false)
    const r = await lookupTeamByToken(text)
    if (!r.ok) return setError(r.reason)
    setError(null)
    setScannedTeam(r.team)
  }

  const submit = async () => {
    if (!scannedTeam || !file) {
      setError('Scan the other team and add a photo first.')
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await onSubmit(submitPhotoWithTeam(team, square, scannedTeam, file))
    if (!result.ok) {
      setError(result.reason ?? 'Submission failed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">1. Scan the other team's QR</h2>
        {scannedTeam ? (
          <ScannedTeamCard scannedTeam={scannedTeam} onChange={() => setScannedTeam(null)} />
        ) : scanning ? (
          <>
            <QRScanner onScan={onScan} />
            <button onClick={() => setScanning(false)} className="w-full py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-300 text-sm">Cancel</button>
          </>
        ) : (
          <button onClick={() => setScanning(true)} className="w-full py-3 rounded-lg bg-slate-800 text-white font-semibold">
            Scan another team's QR
          </button>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">2. Take a photo together</h2>
        <PhotoCapture onChange={setFile} />
      </section>
      <button onClick={submit} disabled={submitting || !scannedTeam || !file} className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50">
        {submitting ? 'Submitting…' : 'Confirm completion'}
      </button>
      {error && <div className="text-sm text-rose-600">{error}</div>}
    </div>
  )
}

function SimplePhotoFlow({ team, square, onSubmit, kind }: VerifProps & { kind: 'auto' | 'mentor' }) {
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!file) return setError('Add a photo first.')
    setSubmitting(true)
    setError(null)
    const promise = kind === 'auto' ? submitPhotoAuto(team, square, file) : submitPhotoMentor(team, square, file)
    const result = await onSubmit(promise)
    if (!result.ok) {
      setError(result.reason ?? 'Submission failed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <PhotoCapture onChange={setFile} />
      {kind === 'mentor' && (
        <p className="text-xs text-slate-500">A mentor will review and approve this. You'll see it light up on your card when they do.</p>
      )}
      <button onClick={submit} disabled={submitting || !file} className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50">
        {submitting ? 'Submitting…' : kind === 'auto' ? 'Confirm completion' : 'Send to mentor'}
      </button>
      {error && <div className="text-sm text-rose-600">{error}</div>}
    </div>
  )
}

function IgUrlFlow({ team, square, onSubmit }: VerifProps) {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    const result = await onSubmit(submitIgUrl(team, square, url))
    if (!result.ok) {
      setError(result.reason ?? 'Submission failed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Instagram post URL</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.instagram.com/p/…"
          className="mt-1 w-full rounded-lg ring-1 ring-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <p className="text-xs text-slate-500">A mentor will check the post for the #BH26 hashtag.</p>
      <button onClick={submit} disabled={submitting || !url} className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50">
        {submitting ? 'Submitting…' : 'Send to mentor'}
      </button>
      {error && <div className="text-sm text-rose-600">{error}</div>}
    </div>
  )
}

function BoothQrHint() {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-white ring-1 ring-slate-200">
      <p className="text-sm text-slate-700">
        Head to the Deepfake booth at the tech showcase. Scan the QR poster there with your phone's camera (or any QR
        scanner) — it'll mark this square as complete.
      </p>
    </div>
  )
}

function ScannedTeamCard({ scannedTeam, onChange }: { scannedTeam: Team; onChange?: () => void }) {
  const swatch =
    scannedTeam.colour === 'red' ? 'bg-team-red' :
    scannedTeam.colour === 'blue' ? 'bg-team-blue' :
    scannedTeam.colour === 'green' ? 'bg-team-green' :
    'bg-team-yellow'
  return (
    <div className="p-4 rounded-lg bg-white shadow-sm ring-1 ring-slate-200 flex items-center gap-3">
      <div className={['w-5 h-5 rounded-full ring-2 ring-white shadow', swatch].join(' ')} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 uppercase tracking-wide">Scanned team</div>
        <div className="text-base font-semibold truncate">{scannedTeam.name}</div>
        <div className="text-xs text-slate-500 capitalize">{scannedTeam.colour} group</div>
      </div>
      {onChange && (
        <button onClick={onChange} className="text-xs text-slate-500 underline">Change</button>
      )}
    </div>
  )
}
