import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTeam } from '../hooks/useTeam'
import {
  checkGithubRepo,
  inspectZip,
  loadSubmission,
  saveSubmission,
  uploadZip,
  type GithubCheck,
  type ZipCheck,
} from '../lib/project'
import type { CodeSubmission } from '../lib/supabase'

export default function ProjectSubmit() {
  const { token } = useParams()
  const { status, data } = useTeam(token)

  const [existing, setExisting] = useState<CodeSubmission | null>(null)
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
    if (status !== 'ok' || !data) return
    loadSubmission(data.team.id).then((sub) => {
      if (!sub) return
      setExisting(sub as CodeSubmission)
      if (sub.github_url) setGithubUrl(sub.github_url as string)
    })
  }, [status, data])

  if (status === 'loading') return <div className="p-6 text-slate-500">Loading…</div>
  if (status !== 'ok' || !data) return <div className="p-6 text-rose-600">Team not found.</div>

  const runRepoCheck = async () => {
    if (!githubUrl) return
    setCheckingRepo(true)
    setError(null)
    setGithubCheck(await checkGithubRepo(githubUrl))
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
    let zip_storage_path: string | null = existing?.zip_storage_path ?? null
    let zip_clean: boolean | null = existing?.zip_clean ?? null
    let zip_check_response: unknown = existing?.zip_check_response ?? null

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
      const upload = await uploadZip(data.team.id, zipFile)
      if (!upload.ok) {
        setError(upload.reason)
        setSubmitting(false)
        return
      }
      zip_storage_path = upload.path
      zip_clean = true
      zip_check_response = zipCheck
    }

    const r = await saveSubmission({
      team_id: data.team.id,
      github_url: githubUrl.trim(),
      github_is_public: githubCheck.isPublic,
      github_check_response: githubCheck,
      zip_storage_path,
      zip_clean,
      zip_check_response,
    })
    if (!r.ok) {
      setError(r.reason ?? 'Save failed.')
      setSubmitting(false)
      return
    }
    setSavedAt(new Date())
    setSubmitting(false)
    const updated = await loadSubmission(data.team.id)
    if (updated) setExisting(updated as CodeSubmission)
    setZipFile(null)
    setZipCheck(null)
  }

  const bonusEarned = existing?.zip_clean === true

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Link to={`/t/${data.team.token}`} className="text-sm text-slate-500 hover:text-slate-800">← Back</Link>
        <h1 className="text-xl font-bold">Project submission</h1>
        <p className="text-sm text-slate-600">
          Submit your project for judging. The GitHub URL is required. A clean ZIP (no <code>node_modules</code>) earns
          you <strong>+1 bonus lucky-draw entry</strong>.
        </p>

        <section className="bg-white rounded-lg ring-1 ring-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold">GitHub repo URL</h2>
          <input
            value={githubUrl}
            onChange={(e) => {
              setGithubUrl(e.target.value)
              setGithubCheck(null)
            }}
            placeholder="https://github.com/owner/repo"
            className="w-full rounded-lg ring-1 ring-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={runRepoCheck}
            disabled={!githubUrl || checkingRepo}
            className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50"
          >
            {checkingRepo ? 'Checking…' : 'Check repo'}
          </button>
          {githubCheck && (
            <div
              className={[
                'p-3 rounded-lg text-sm',
                githubCheck.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800',
              ].join(' ')}
            >
              {githubCheck.ok
                ? `Public ✓ — default branch ${githubCheck.defaultBranch}`
                : githubCheck.reason}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg ring-1 ring-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Optional: code ZIP for the bonus entry</h2>
          <p className="text-xs text-slate-500">
            We'll reject ZIPs that contain <code>node_modules</code>, <code>.git</code>, <code>.venv</code>, or single
            files larger than 50 MB.
          </p>
          {existing?.zip_clean && !zipFile && (
            <div className="p-2 rounded bg-emerald-50 text-emerald-800 text-xs">
              Clean ZIP already on file — bonus entry secured.
            </div>
          )}
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => onZipPick(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {inspectingZip && <p className="text-xs text-slate-500">Inspecting ZIP…</p>}
          {zipCheck && (
            <div
              className={[
                'p-3 rounded-lg text-sm',
                zipCheck.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800',
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
          className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save submission'}
        </button>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        {savedAt && (
          <div className="text-sm text-emerald-700">
            Saved at {savedAt.toLocaleTimeString()}. {bonusEarned ? 'Bonus entry secured ✨' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
