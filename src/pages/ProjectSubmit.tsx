import { useEffect, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { useTeam } from '../hooks/useTeam'
import { inspectZip, type ZipCheck } from '../lib/project'
import { uploadToConvex } from '../lib/storage'
import type { StorageId } from '../lib/types'

type GithubCheck =
  | { ok: true; isPublic: true; defaultBranch: string; description: string | null }
  | { ok: false; isPublic: false; reason: string }

export default function ProjectSubmit() {
  const { token } = useParams()
  const { status, data } = useTeam(token)
  const teamId = data?.team._id
  const existing = useQuery(api.codeSubmissions.getForTeam, teamId ? { teamId } : 'skip')

  const checkRepoAction = useAction(api.githubCheck.check)
  const generateUploadUrl = useMutation(api.upload.generateUploadUrl)
  const saveSubmission = useMutation(api.codeSubmissions.save)

  const [githubUrl, setGithubUrl] = useState('')
  const [githubCheck, setGithubCheck] = useState<GithubCheck | null>(null)
  const [checkingRepo, setCheckingRepo] = useState(false)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [zipCheck, setZipCheck] = useState<ZipCheck | null>(null)
  const [inspectingZip, setInspectingZip] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (existing?.githubUrl && !githubUrl) setGithubUrl(existing.githubUrl)
  }, [existing, githubUrl])

  if (status === 'loading') return <div className="p-6 text-bh-dim bh-display text-xs">Loading…</div>
  if (status !== 'ok' || !data) return <div className="p-6 text-bh-magenta">Team not found.</div>

  const runRepoCheck = async () => {
    if (!githubUrl) return
    setCheckingRepo(true)
    setError(null)
    const result = await checkRepoAction({ url: githubUrl })
    setGithubCheck(result)
    setCheckingRepo(false)
  }

  const onZipPick = async (file: File | null) => {
    setZipFile(file)
    setZipCheck(null)
    if (!file) return
    setInspectingZip(true)
    setZipCheck(await inspectZip(file))
    setInspectingZip(false)
  }

  const submit = async () => {
    if (!githubCheck?.ok) {
      setError('Run the GitHub check first and make sure it passes.')
      return
    }
    setSubmitting(true)
    setError(null)
    let zipStorageId: StorageId | undefined = existing?.zipStorageId
    let zipFilename: string | undefined = existing?.zipFilename
    let zipClean: boolean | undefined = existing?.zipClean
    let zipCheckResponse: unknown = existing?.zipCheckResponse

    if (zipFile) {
      if (!zipCheck) {
        setError('Wait for the ZIP inspection to finish.')
        setSubmitting(false)
        return
      }
      if (!zipCheck.ok) {
        setError(`Fix the ZIP issues first: ${zipCheck.reason}`)
        setSubmitting(false)
        return
      }
      const url = await generateUploadUrl({})
      const upload = await uploadToConvex(url, zipFile)
      if (!upload.ok) {
        setError(upload.reason)
        setSubmitting(false)
        return
      }
      zipStorageId = upload.storageId
      zipFilename = zipFile.name
      zipClean = true
      zipCheckResponse = zipCheck
    }

    try {
      await saveSubmission({
        teamId: data.team._id,
        githubUrl: githubUrl.trim(),
        githubIsPublic: githubCheck.isPublic,
        githubCheckResponse: githubCheck,
        zipStorageId,
        zipFilename,
        zipClean,
        zipCheckResponse,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
      setSubmitting(false)
      return
    }
    setSavedAt(new Date())
    setSubmitting(false)
    setZipFile(null)
    setZipCheck(null)
  }

  const bonusEarned = existing?.zipClean === true

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Link to={`/t/${data.team.token}`} className="bh-display text-xs tracking-wider text-bh-dim hover:text-bh-lime">← Back</Link>
        <h1 className="bh-display text-xl font-bold text-white">Project Submission</h1>
        <p className="text-sm text-bh-dim">
          Submit your project for judging. The GitHub URL is required. A clean ZIP (no <code className="font-mono text-bh-lime">node_modules</code>) earns
          you <strong className="text-bh-lime">+1 bonus lucky-draw entry</strong>.
        </p>

        <section className="bh-card p-4 space-y-3">
          <h2 className="bh-display text-xs tracking-wider text-bh-lime">1. GITHUB REPO URL</h2>
          <input
            value={githubUrl}
            onChange={(e) => {
              setGithubUrl(e.target.value)
              setGithubCheck(null)
            }}
            placeholder="https://github.com/owner/repo"
            className="w-full rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white placeholder:text-bh-dim focus:ring-bh-lime focus:outline-none"
          />
          <button
            onClick={runRepoCheck}
            disabled={!githubUrl || checkingRepo}
            className="bh-btn-ghost text-sm disabled:opacity-50"
          >
            {checkingRepo ? 'Checking…' : 'Check repo'}
          </button>
          {githubCheck && (
            <div
              className={[
                'p-3 rounded-md text-sm ring-1',
                githubCheck.ok ? 'bg-bh-lime/10 text-bh-lime ring-bh-lime/40' : 'bg-bh-magenta/10 text-bh-magenta ring-bh-magenta/40',
              ].join(' ')}
            >
              {githubCheck.ok
                ? `Public ✓ — default branch ${githubCheck.defaultBranch}`
                : githubCheck.reason}
            </div>
          )}
        </section>

        <section className="bh-card p-4 space-y-3">
          <h2 className="bh-display text-xs tracking-wider text-bh-lime">2. OPTIONAL: CODE ZIP</h2>
          <p className="text-xs text-bh-dim">
            We'll reject ZIPs that contain <code className="font-mono">node_modules</code>, <code className="font-mono">.git</code>, <code className="font-mono">.venv</code>, or single
            files larger than 50 MB.
          </p>
          {existing?.zipClean && !zipFile && (
            <div className="p-2 rounded bg-bh-lime/10 text-bh-lime ring-1 ring-bh-lime/40 text-xs">
              Clean ZIP already on file — bonus entry secured.
            </div>
          )}
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => onZipPick(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-bh-dim file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bh-display file:text-xs file:tracking-wider file:bg-bh-lime file:text-black hover:file:bg-white"
          />
          {inspectingZip && <p className="text-xs text-bh-dim">Inspecting ZIP…</p>}
          {zipCheck && (
            <div
              className={[
                'p-3 rounded-md text-sm ring-1',
                zipCheck.ok ? 'bg-bh-lime/10 text-bh-lime ring-bh-lime/40' : 'bg-bh-magenta/10 text-bh-magenta ring-bh-magenta/40',
              ].join(' ')}
            >
              {zipCheck.ok
                ? `Clean ✓ — ${zipCheck.fileCount} files, ${(zipCheck.totalBytes / 1024 / 1024).toFixed(1)} MB`
                : zipCheck.reason}
            </div>
          )}
        </section>

        <button
          onClick={submit}
          disabled={submitting || !githubCheck?.ok || (zipFile != null && zipCheck != null && !zipCheck.ok)}
          className="bh-btn-primary w-full disabled:opacity-50 disabled:hover:bg-bh-lime disabled:hover:shadow-none"
        >
          {submitting ? 'Saving…' : 'Save submission'}
        </button>
        {error && <div className="text-sm text-bh-magenta">{error}</div>}
        {savedAt && (
          <div className="text-sm text-bh-lime bh-display tracking-wider">
            Saved at {savedAt.toLocaleTimeString()}. {bonusEarned ? '★ BONUS ENTRY SECURED' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
