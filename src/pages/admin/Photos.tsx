import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import { friendlyError } from '../../lib/errors'
import type { Id } from '../../../convex/_generated/dataModel'

export default function Photos() {
  return <AdminLayout>{(creds) => <Body mentorName={creds.name} passcode={creds.passcode} />}</AdminLayout>
}

function Body({ mentorName, passcode }: { mentorName: string; passcode: string }) {
  const items = useQuery(api.completions.listApprovedPhotos)
  const rejectPhoto = useMutation(api.admin.rejectApprovedPhoto)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  if (items === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading photos…</p>
  }

  const slug = (s: string | undefined) => (s ?? 'unknown').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'unknown'
  const extForType = (type: string) =>
    ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic' })[type] ?? 'jpg'

  const downloadAll = async () => {
    const withUrls = items.filter((i) => i.photoUrl)
    if (withUrls.length === 0) return
    setError(null)
    setDownloading('Preparing…')
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      for (let i = 0; i < withUrls.length; i++) {
        const item = withUrls[i]
        setDownloading(`Fetching ${i + 1}/${withUrls.length}…`)
        const resp = await fetch(item.photoUrl as string)
        if (!resp.ok) throw new Error(`Failed to fetch photo ${i + 1}: HTTP ${resp.status}`)
        const blob = await resp.blob()
        const name = `${slug(item.team?.name)}__${slug(item.square?.title)}__${item.completion._id}.${extForType(blob.type)}`
        zip.file(name, blob)
      }
      setDownloading('Zipping…')
      const out = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(out)
      const a = document.createElement('a')
      a.href = url
      a.download = `codeexp_photos_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(friendlyError(e, 'Download all failed.'))
    }
    setDownloading(null)
  }

  const onReject = async (completionId: Id<'squareCompletions'>) => {
    if (!window.confirm('Reject this photo? It will be removed from the photo wall and the team will need to resubmit.')) return
    setBusy(completionId)
    setError(null)
    try {
      await rejectPhoto({ passcode, mentorName, completionId })
    } catch (e) {
      setError(friendlyError(e, 'Reject failed.'))
    }
    setBusy(null)
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="bh-display text-xl font-bold text-white mb-1">Approved Photos</h2>
          <p className="text-xs text-bh-dim">
            {items.length} approved photo(s). Rejecting removes from the photo wall and notifies the team.
          </p>
        </div>
        <button
          onClick={downloadAll}
          disabled={downloading !== null || items.length === 0}
          className="bh-btn-ghost text-xs disabled:opacity-50 shrink-0"
        >
          {downloading ?? `Download all (.zip)`}
        </button>
      </header>
      {error && <p className="text-sm text-bh-magenta">{error}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-bh-dim">No approved photos.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.completion._id} className="bh-card p-2 space-y-2">
              {item.photoUrl && (
                <img
                  src={item.photoUrl}
                  alt={item.square?.title ?? 'Photo'}
                  className="w-full aspect-square object-cover rounded"
                />
              )}
              <div className="text-xs">
                <div className="bh-display font-bold text-white truncate">{item.team?.name ?? '?'}</div>
                <div className="text-bh-dim truncate">{item.square?.title ?? '?'}</div>
                {item.photoUrl && (
                  <a href={item.photoUrl} target="_blank" rel="noreferrer" className="text-bh-cyan underline">
                    Open / download
                  </a>
                )}
              </div>
              <button
                onClick={() => onReject(item.completion._id)}
                disabled={busy === item.completion._id}
                className="w-full bh-display px-2 py-1.5 rounded text-[0.65rem] tracking-wider ring-1 ring-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-40"
              >
                {busy === item.completion._id ? 'Rejecting…' : 'Reject photo'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
