import { useState } from 'react'
import { useConvex, useMutation } from 'convex/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PhotoCapture from '../components/PhotoCapture'
import QRScanner from '../components/QRScanner'
import { api } from '../../convex/_generated/api'
import { useTeam } from '../hooks/useTeam'
import { parseTeamToken } from '../lib/qr'
import { friendlyError } from '../lib/errors'
import { isCategoryLocked, isSquareClosed, isSquareReleased } from '../lib/squares'
import { uploadToConvex } from '../lib/storage'
import type { BingoSquare, Team } from '../lib/types'

type Outcome = { ok: true; pending: boolean } | { ok: false; reason: string }

export default function SquareDetail() {
  const { token, position } = useParams()
  const { status, data } = useTeam(token)
  const navigate = useNavigate()

  if (status === 'loading') return <div className="p-6 text-bh-dim bh-display text-xs">Loading…</div>
  if (status !== 'ok' || !data) return <div className="p-6 text-bh-magenta">Team not found.</div>

  const square = data.squares.find((s) => s.position === Number(position))
  if (!square) return <div className="p-6 text-bh-magenta">Square not found.</div>

  const existing = data.completions.find((c) => c.squareId === square._id)
  const completed = existing?.status === 'approved'
  const pending = existing?.status === 'pending'
  const rejected = existing?.status === 'rejected'
  const categoryLocked = isCategoryLocked(square, data.team)
  const closed = !categoryLocked && isSquareClosed(square)
  const timedLocked = !categoryLocked && !closed && !isSquareReleased(square)

  const finishSubmit = async (resultPromise: Promise<Outcome>): Promise<{ ok: boolean; reason?: string }> => {
    const r = await resultPromise
    if (!r.ok) return { ok: false, reason: r.reason }
    navigate(`/t/${data.team.token}`, { replace: true })
    return { ok: true }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        <Link to={`/t/${data.team.token}`} className="bh-display text-xs tracking-wider text-bh-dim hover:text-bh-lime">
          ← Back
        </Link>
        <h1 className="mt-2 bh-display text-xl font-bold text-white">{square.title}</h1>
        <p className="text-sm text-bh-dim mb-4">{square.description}</p>

        {categoryLocked && (
          <div className="p-3 rounded-md ring-1 ring-bh-line bg-bh-panel/60 text-bh-dim text-sm mb-4">
            <strong className="bh-display tracking-wider text-white">Not your category.</strong> This square is reserved for the other category — it's been auto-filled on your card so it doesn't block lines.
          </div>
        )}
        {closed && !completed && (
          <div className="p-3 rounded-md ring-1 ring-bh-magenta/40 bg-bh-magenta/10 text-bh-magenta text-sm mb-4">
            <strong className="bh-display tracking-wider">Task Closed.</strong> This mission has expired and can no longer be completed.
          </div>
        )}
        {timedLocked && (
          <div className="p-3 rounded-md ring-1 ring-bh-yellow/40 bg-bh-yellow/10 text-bh-yellow text-sm mb-4">
            <strong className="bh-display tracking-wider">Coming soon.</strong> This square unlocks later in the event.
          </div>
        )}
        {completed && (
          <div className="p-3 rounded-md ring-1 ring-bh-lime/40 bg-bh-lime/10 text-bh-lime text-sm mb-4 bh-display tracking-wider">Already completed ✓</div>
        )}
        {pending && (
          <div className="p-3 rounded-md ring-1 ring-bh-yellow/40 bg-bh-yellow/10 text-bh-yellow text-sm mb-4">
            Waiting for a mentor to approve. You can resubmit if you'd like to replace your evidence.
          </div>
        )}
        {rejected && (
          <div className="p-3 rounded-md ring-1 ring-bh-magenta/40 bg-bh-magenta/10 text-sm mb-4">
            <strong className="bh-display tracking-wider text-bh-magenta">Rejected</strong>
            {existing?.rejectedReason && (
              <span className="text-white/80"> — {existing.rejectedReason}</span>
            )}
            <p className="text-bh-dim mt-1 text-xs">You can resubmit below.</p>
          </div>
        )}

        {!data.gameOpen && !completed && !categoryLocked && !timedLocked && !closed && (
          <div className="p-3 rounded-md ring-1 ring-bh-yellow/40 bg-bh-yellow/10 text-bh-yellow text-sm mb-4">
            The bingo is paused — submissions are locked. Try again once the game reopens.
          </div>
        )}
        {!completed && !categoryLocked && !timedLocked && !closed && data.gameOpen && (
          <Verification team={data.team} square={square} onSubmit={finishSubmit} />
        )}
      </div>
    </div>
  )
}

type VerifProps = {
  team: Team
  square: BingoSquare
  onSubmit: (resultPromise: Promise<Outcome>) => Promise<{ ok: boolean; reason?: string }>
}

function Verification({ team, square, onSubmit }: VerifProps) {
  switch (square.verificationKind) {
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
      return <ClaimQrFlow team={team} square={square} onSubmit={onSubmit} />
  }
}

function useTeamLookup() {
  const convex = useConvex()
  return async (rawScan: string): Promise<{ ok: true; team: Team } | { ok: false; reason: string }> => {
    const tk = parseTeamToken(rawScan)
    if (!tk) return { ok: false, reason: "That doesn't look like a team QR." }
    const team = await convex.query(api.teams.getByToken, { token: tk })
    if (!team) return { ok: false, reason: 'No team found for that QR.' }
    return { ok: true, team }
  }
}

function asReason(e: unknown): string {
  return friendlyError(e)
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-md ring-1 ring-bh-magenta/40 bg-bh-magenta/10 text-sm text-white">
      <span className="bh-display text-bh-magenta text-xs tracking-wider block mb-1">Oops!</span>
      {message}
    </div>
  )
}

async function uploadPhoto(generateUploadUrl: () => Promise<string>, file: File) {
  const url = await generateUploadUrl()
  return uploadToConvex(url, file)
}

function ScanTeamFlow({ team, square, onSubmit }: VerifProps) {
  const [scanning, setScanning] = useState(false)
  const [scannedTeam, setScannedTeam] = useState<Team | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lookup = useTeamLookup()
  const submitScanTeam = useMutation(api.completions.submitScanTeam)

  const onScan = async (text: string) => {
    if (submitting || scannedTeam) return
    setScanning(false)
    const r = await lookup(text)
    if (!r.ok) return setError(r.reason)
    setError(null)
    setScannedTeam(r.team)
  }

  const submit = async () => {
    if (!scannedTeam) return
    setSubmitting(true)
    setError(null)
    const result = await onSubmit(
      submitScanTeam({ teamId: team._id, squareId: square._id, scannedTeamId: scannedTeam._id })
        .then<Outcome>(() => ({ ok: true, pending: false }))
        .catch<Outcome>((e) => ({ ok: false, reason: asReason(e) })),
    )
    if (!result.ok) {
      setError(result.reason ?? 'Submission failed.')
      setSubmitting(false)
    }
  }

  if (scannedTeam) {
    return (
      <div className="space-y-3">
        <ScannedTeamCard scannedTeam={scannedTeam} />
        <button onClick={submit} disabled={submitting} className="bh-btn-primary w-full disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none">
          {submitting ? 'Submitting…' : 'Confirm completion'}
        </button>
        <button onClick={() => setScannedTeam(null)} disabled={submitting} className="w-full py-2 rounded-md bg-bh-panel text-bh-dim ring-1 ring-bh-line hover:text-white hover:bg-bh-surface text-sm">
          Scan again
        </button>
        {error && <ErrorBanner message={error} />}
      </div>
    )
  }
  if (scanning) {
    return (
      <div className="space-y-3">
        <QRScanner onScan={onScan} />
        <button onClick={() => setScanning(false)} className="w-full py-2 rounded-md bg-bh-panel text-bh-dim ring-1 ring-bh-line hover:text-white hover:bg-bh-surface text-sm">Cancel</button>
        {error && <ErrorBanner message={error} />}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <button onClick={() => setScanning(true)} className="bh-btn-primary w-full">
        Scan another team's QR
      </button>
      <p className="text-xs text-bh-dim">Tip: you can scan your own team's QR if you're claiming yourself.</p>
      {error && <ErrorBanner message={error} />}
    </div>
  )
}

function ScanTeamWithAnswerFlow({ team, square, onSubmit }: VerifProps) {
  const [scanning, setScanning] = useState(false)
  const [scannedTeam, setScannedTeam] = useState<Team | null>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lookup = useTeamLookup()
  const submitScanTeamWithAnswer = useMutation(api.completions.submitScanTeamWithAnswer)

  const onScan = async (text: string) => {
    if (submitting || scannedTeam) return
    setScanning(false)
    const r = await lookup(text)
    if (!r.ok) return setError(r.reason)
    if (r.team._id === team._id) {
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
    const result = await onSubmit(
      submitScanTeamWithAnswer({
        teamId: team._id,
        squareId: square._id,
        scannedTeamId: scannedTeam._id,
        textAnswer: answer.trim(),
      })
        .then<Outcome>(() => ({ ok: true, pending: false }))
        .catch<Outcome>((e) => ({ ok: false, reason: asReason(e) })),
    )
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
          <span className="bh-display text-[0.65rem] tracking-wider text-bh-dim">Their answer (short)</span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value.slice(0, 280))}
            rows={3}
            placeholder="Type a quick summary of what they said…"
            className="mt-1 w-full rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white placeholder:text-bh-dim focus:ring-bh-lime focus:outline-none"
          />
          <span className="text-xs text-bh-dim/70">{answer.length}/280</span>
        </label>
        <button onClick={submit} disabled={submitting} className="bh-btn-primary w-full disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none">
          {submitting ? 'Submitting…' : 'Confirm completion'}
        </button>
        <button onClick={() => setScannedTeam(null)} disabled={submitting} className="w-full py-2 rounded-md bg-bh-panel text-bh-dim ring-1 ring-bh-line hover:text-white hover:bg-bh-surface text-sm">
          Scan again
        </button>
        {error && <ErrorBanner message={error} />}
      </div>
    )
  }
  if (scanning) {
    return (
      <div className="space-y-3">
        <QRScanner onScan={onScan} />
        <button onClick={() => setScanning(false)} className="w-full py-2 rounded-md bg-bh-panel text-bh-dim ring-1 ring-bh-line hover:text-white hover:bg-bh-surface text-sm">Cancel</button>
        {error && <ErrorBanner message={error} />}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <button onClick={() => setScanning(true)} className="bh-btn-primary w-full">
        Scan another team's QR
      </button>
      <p className="text-xs text-bh-dim">
        Across the 5 blue squares, you must scan <strong>5 different teams with 5 different colours</strong>.
      </p>
      {error && <ErrorBanner message={error} />}
    </div>
  )
}

function PhotoWithTeamFlow({ team, square, onSubmit }: VerifProps) {
  const [scanning, setScanning] = useState(false)
  const [scannedTeam, setScannedTeam] = useState<Team | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lookup = useTeamLookup()
  const generateUploadUrl = useMutation(api.upload.generateUploadUrl)
  const submitPhotoWithTeam = useMutation(api.completions.submitPhotoWithTeam)

  const onScan = async (text: string) => {
    if (submitting || scannedTeam) return
    setScanning(false)
    const r = await lookup(text)
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
    const upload = await uploadPhoto(generateUploadUrl, file)
    if (!upload.ok) {
      setError(upload.reason)
      setSubmitting(false)
      return
    }
    const result = await onSubmit(
      submitPhotoWithTeam({
        teamId: team._id,
        squareId: square._id,
        scannedTeamId: scannedTeam._id,
        photoStorageId: upload.storageId,
      })
        .then<Outcome>(() => ({ ok: true, pending: false }))
        .catch<Outcome>((e) => ({ ok: false, reason: asReason(e) })),
    )
    if (!result.ok) {
      setError(result.reason ?? 'Submission failed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="bh-display text-xs tracking-wider text-bh-lime">1. Scan the other team's QR</h2>
        {scannedTeam ? (
          <ScannedTeamCard scannedTeam={scannedTeam} onChange={() => setScannedTeam(null)} />
        ) : scanning ? (
          <>
            <QRScanner onScan={onScan} />
            <button onClick={() => setScanning(false)} className="w-full py-2 rounded-md bg-bh-panel text-bh-dim ring-1 ring-bh-line hover:text-white hover:bg-bh-surface text-sm">Cancel</button>
          </>
        ) : (
          <button onClick={() => setScanning(true)} className="bh-btn-primary w-full">
            Scan another team's QR
          </button>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="bh-display text-xs tracking-wider text-bh-lime">2. Take a photo together</h2>
        <PhotoCapture onChange={setFile} />
      </section>
      <button onClick={submit} disabled={submitting || !scannedTeam || !file} className="bh-btn-primary w-full disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none">
        {submitting ? 'Submitting…' : 'Confirm completion'}
      </button>
      {error && <ErrorBanner message={error} />}
    </div>
  )
}

function SimplePhotoFlow({ team, square, onSubmit, kind }: VerifProps & { kind: 'auto' | 'mentor' }) {
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generateUploadUrl = useMutation(api.upload.generateUploadUrl)
  const submitPhotoAuto = useMutation(api.completions.submitPhotoAuto)
  const submitPhotoMentor = useMutation(api.completions.submitPhotoMentor)

  const submit = async () => {
    if (!file) return setError('Add a photo first.')
    setSubmitting(true)
    setError(null)
    const upload = await uploadPhoto(generateUploadUrl, file)
    if (!upload.ok) {
      setError(upload.reason)
      setSubmitting(false)
      return
    }
    const fn = kind === 'auto' ? submitPhotoAuto : submitPhotoMentor
    const result = await onSubmit(
      fn({ teamId: team._id, squareId: square._id, photoStorageId: upload.storageId })
        .then<Outcome>(() => ({ ok: true, pending: kind === 'mentor' }))
        .catch<Outcome>((e) => ({ ok: false, reason: asReason(e) })),
    )
    if (!result.ok) {
      setError(result.reason ?? 'Submission failed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <PhotoCapture onChange={setFile} />
      {kind === 'mentor' && (
        <p className="text-xs text-bh-dim">A mentor will review and approve this. You'll see it light up on your card when they do.</p>
      )}
      <button onClick={submit} disabled={submitting || !file} className="bh-btn-primary w-full disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none">
        {submitting ? 'Submitting…' : kind === 'auto' ? 'Confirm completion' : 'Send to mentor'}
      </button>
      {error && <ErrorBanner message={error} />}
    </div>
  )
}

function IgUrlFlow({ team, square, onSubmit }: VerifProps) {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitIgUrl = useMutation(api.completions.submitIgUrl)

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    const result = await onSubmit(
      submitIgUrl({ teamId: team._id, squareId: square._id, igUrl: url })
        .then<Outcome>(() => ({ ok: true, pending: true }))
        .catch<Outcome>((e) => ({ ok: false, reason: asReason(e) })),
    )
    if (!result.ok) {
      setError(result.reason ?? 'Submission failed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="bh-display text-[0.65rem] tracking-wider text-bh-dim">Instagram post URL</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.instagram.com/p/…"
          className="mt-1 w-full rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white placeholder:text-bh-dim focus:ring-bh-lime focus:outline-none"
        />
      </label>
      <p className="text-xs text-bh-dim">Make sure your post includes <strong>#BrainHack2026</strong> and <strong>#DSTA</strong>. A mentor will verify.</p>
      <button onClick={submit} disabled={submitting || !url} className="bh-btn-primary w-full disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none">
        {submitting ? 'Submitting…' : 'Send to mentor'}
      </button>
      {error && <ErrorBanner message={error} />}
    </div>
  )
}

function ClaimQrFlow({ team, square, onSubmit }: VerifProps) {
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitClaimQr = useMutation(api.completions.submitClaimQr)

  const isArrival = square.claimSlug === 'arrive-9am'
  const isDeepfake = square.claimSlug === 'deepfake'

  const onScan = async (text: string) => {
    if (submitting) return
    setScanning(false)
    // Parse the claim slug from the scanned URL (e.g. https://bingo.codeexp.tk.sg/claim/deepfake)
    const m = text.match(/\/claim\/([^/?#]+)/)
    if (!m) {
      setError("That doesn't look like an event claim QR. Try scanning the poster QR code.")
      return
    }
    if (m[1] !== square.claimSlug) {
      setError(`Wrong QR — this square needs the "${square.claimSlug}" QR, but you scanned "${m[1]}".`)
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await onSubmit(
      submitClaimQr({ teamId: team._id, squareId: square._id })
        .then<Outcome>(() => ({ ok: true, pending: false }))
        .catch<Outcome>((e) => ({ ok: false, reason: asReason(e) })),
    )
    if (!result.ok) {
      setError(result.reason ?? 'Claim failed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bh-card">
        <p className="text-sm text-white/80">
          {isArrival
            ? 'Scan the CODE_EXP briefing QR during the 9am briefing to mark this square as complete.'
            : isDeepfake
              ? 'Complete the Deepfake booth challenge, then scan the booth QR to mark this square as complete.'
              : 'Scan the event QR to mark this square as complete.'}
        </p>
      </div>
      {scanning ? (
        <>
          <QRScanner onScan={onScan} />
          <button onClick={() => setScanning(false)} className="w-full py-2 rounded-md bg-bh-panel text-bh-dim ring-1 ring-bh-line hover:text-white hover:bg-bh-surface text-sm">Cancel</button>
        </>
      ) : (
        <button onClick={() => setScanning(true)} disabled={submitting} className="bh-btn-primary w-full disabled:opacity-50">
          {submitting ? 'Claiming…' : 'Scan event QR'}
        </button>
      )}
      {error && <ErrorBanner message={error} />}
    </div>
  )
}

function ScannedTeamCard({ scannedTeam, onChange }: { scannedTeam: Team; onChange?: () => void }) {
  const swatch =
    scannedTeam.colour === 'red' ? 'bg-team-red' :
    scannedTeam.colour === 'blue' ? 'bg-team-blue' :
    scannedTeam.colour === 'green' ? 'bg-team-green' :
    scannedTeam.colour === 'purple' ? 'bg-team-purple' :
    'bg-team-yellow'
  return (
    <div className="p-4 bh-card flex items-center gap-3">
      <div className={['w-5 h-5 rounded-full ring-2 ring-black/40', swatch].join(' ')} />
      <div className="flex-1 min-w-0">
        <div className="bh-display text-[0.6rem] text-bh-dim tracking-wider">Scanned team</div>
        <div className="bh-display text-base font-bold truncate text-white">{scannedTeam.name}</div>
        <div className="text-xs text-bh-dim capitalize">{scannedTeam.colour} group</div>
      </div>
      {onChange && (
        <button onClick={onChange} className="text-xs text-bh-lime underline">Change</button>
      )}
    </div>
  )
}
