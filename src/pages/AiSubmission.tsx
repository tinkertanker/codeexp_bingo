import { useEffect, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { useTeam } from '../hooks/useTeam'
import { friendlyError } from '../lib/errors'
import { effectiveCategory } from '../lib/squares'

type AiCheck =
  | { ok: true; accessible: true; title: string | null }
  | { ok: false; accessible: false; reason: string }

const DEADLINE_LABEL = '10 Jun 2026, 6:00 PM (SGT)'

export default function AiSubmission() {
  const { token } = useParams()
  const { status, data } = useTeam(token)
  const teamId = data?.team._id
  const existing = useQuery(api.aiSubmissions.getForTeam, teamId ? { teamId } : 'skip')
  const config = useQuery(api.aiSubmissions.config)

  const checkLink = useAction(api.aiCheck.check)
  const save = useMutation(api.aiSubmissions.save)

  const [driveUrl, setDriveUrl] = useState('')
  const [check, setCheck] = useState<AiCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (existing?.driveUrl && !driveUrl) setDriveUrl(existing.driveUrl)
  }, [existing, driveUrl])

  if (status === 'loading') return <div className="p-6 text-bh-dim bh-display text-xs">Loading…</div>
  if (status !== 'ok' || !data) return <div className="p-6 text-bh-magenta">Team not found.</div>

  if (effectiveCategory(data.team) !== 'cat2') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-md mx-auto space-y-4">
          <Link to={`/t/${data.team.token}`} className="bh-display text-xs tracking-wider text-bh-dim hover:text-bh-lime">
            ← Back
          </Link>
          <h1 className="bh-display text-xl font-bold text-white">Innovative use of AI</h1>
          <div className="p-3 rounded-md ring-1 ring-bh-line bg-bh-panel/60 text-bh-dim text-sm">
            This submission is only for <strong className="text-white">Open category</strong> teams. Your team is in the Beginner category.
          </div>
        </div>
      </div>
    )
  }

  const deadlinePassed = config !== undefined && Date.now() > config.deadline

  const runCheck = async () => {
    if (!driveUrl.trim()) return
    setChecking(true)
    setError(null)
    setCheck(await checkLink({ url: driveUrl.trim() }))
    setChecking(false)
  }

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await save({
        teamId: data.team._id,
        driveUrl: driveUrl.trim(),
        accessible: check?.ok ?? undefined,
        checkResponse: check ?? undefined,
      })
      setSavedAt(new Date())
    } catch (e) {
      setError(friendlyError(e, 'Save failed.'))
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Link to={`/t/${data.team.token}`} className="bh-display text-xs tracking-wider text-bh-dim hover:text-bh-lime">
          ← Back
        </Link>
        <h1 className="bh-display text-xl font-bold text-white">Innovative use of AI</h1>
        <p className="text-sm text-bh-dim">
          Submit your "Innovative use of AI" entry for DSTA to judge. Upload your file (any format) to Google Drive, set
          sharing to <strong className="text-white">"Anyone with the link"</strong>, and paste the link below.
          Private links will get a very direct complaint from the checker.
        </p>
        <div
          className={[
            'p-3 rounded-md text-sm ring-1 bh-display tracking-wider',
            deadlinePassed
              ? 'bg-bh-magenta/10 text-bh-magenta ring-bh-magenta/40'
              : 'bg-bh-yellow/10 text-bh-yellow ring-bh-yellow/40',
          ].join(' ')}
        >
          {deadlinePassed ? 'Deadline passed' : 'Deadline'}: {DEADLINE_LABEL}
        </div>

        <section className="bh-card p-4 space-y-3">
          <h2 className="bh-display text-xs tracking-wider text-bh-lime">GOOGLE DRIVE LINK</h2>
          <input
            value={driveUrl}
            onChange={(e) => {
              setDriveUrl(e.target.value)
              setCheck(null)
            }}
            placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
            className="w-full rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white placeholder:text-bh-dim focus:ring-bh-lime focus:outline-none"
          />
          <button onClick={runCheck} disabled={!driveUrl.trim() || checking} className="bh-btn-ghost text-sm disabled:opacity-50">
            {checking ? 'Checking…' : 'Check link is accessible'}
          </button>
          {check && (
            <div
              className={[
                'p-3 rounded-md text-sm ring-1',
                check.ok ? 'bg-bh-lime/10 text-bh-lime ring-bh-lime/40' : 'bg-bh-magenta/10 text-bh-magenta ring-bh-magenta/40',
              ].join(' ')}
            >
              {check.ok ? `Accessible ✓${check.title ? ` — ${check.title}` : ''}` : check.reason}
            </div>
          )}
        </section>

        <button
          onClick={submit}
          disabled={submitting || deadlinePassed || !driveUrl.trim()}
          className="bh-btn-primary w-full disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none"
        >
          {submitting ? 'Saving…' : 'Save submission'}
        </button>
        {!check?.ok && driveUrl.trim() && !deadlinePassed && (
          <p className="text-xs text-bh-dim">
            Tip: run the accessibility check first so DSTA can definitely open your file. You can still save without it.
          </p>
        )}
        {error && <div className="text-sm text-bh-magenta">{error}</div>}
        {existing && !savedAt && (
          <div className="text-xs text-bh-dim bh-display tracking-wider">
            On file: {existing.accessible === true ? 'accessible ✓' : existing.accessible === false ? 'not yet accessible' : 'unverified'} ·{' '}
            submitted {new Date(existing.submittedAt).toLocaleString()}
          </div>
        )}
        {savedAt && (
          <div className="text-sm text-bh-lime bh-display tracking-wider">Saved at {savedAt.toLocaleTimeString()}.</div>
        )}
      </div>
    </div>
  )
}
