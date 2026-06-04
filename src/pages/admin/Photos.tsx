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

  if (items === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading photos…</p>
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
      <header>
        <h2 className="bh-display text-xl font-bold text-white mb-1">Approved Photos</h2>
        <p className="text-xs text-bh-dim">
          {items.length} approved photo(s). Rejecting removes from the photo wall and notifies the team.
        </p>
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
