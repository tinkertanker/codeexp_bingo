import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import type { SquareCompletionId } from '../../lib/types'

export default function ApprovalQueue() {
  return (
    <AdminLayout>
      {(creds) => <Queue mentorName={creds.name} passcode={creds.passcode} />}
    </AdminLayout>
  )
}

function Queue({ mentorName, passcode }: { mentorName: string; passcode: string }) {
  const items = useQuery(api.completions.listPending)
  const approve = useMutation(api.admin.approveCompletion)
  const reject = useMutation(api.admin.rejectCompletion)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<SquareCompletionId | null>(null)

  const onApprove = async (completionId: SquareCompletionId) => {
    setBusyId(completionId)
    setError(null)
    try {
      await approve({ passcode, mentorName, completionId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed.')
    }
    setBusyId(null)
  }

  const onReject = async (completionId: SquareCompletionId) => {
    const reason = window.prompt('Reason for rejection? (shown to the team)')
    if (!reason) return
    setBusyId(completionId)
    setError(null)
    try {
      await reject({ passcode, mentorName, completionId, reason })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed.')
    }
    setBusyId(null)
  }

  return (
    <div>
      <h2 className="bh-display text-xl font-bold mb-4 text-white">Pending approvals</h2>
      {items === undefined && <p className="text-sm text-bh-dim bh-display">Loading…</p>}
      {error && <p className="text-sm text-bh-magenta mb-2">{error}</p>}
      {items !== undefined && items.length === 0 && (
        <p className="text-sm text-bh-dim">Nothing pending. Nice work.</p>
      )}
      <ul className="space-y-3">
        {items?.map((item) => (
          <li key={item.completion._id} className="bh-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="bh-display text-sm font-bold text-white">
                  {item.team?.name ?? '(unknown team)'}
                  {item.team && <span className="text-xs text-bh-dim font-normal"> · {item.team.colour}</span>}
                </div>
                <div className="text-xs text-bh-dim mb-2">
                  {item.square?.title}
                  {item.square && <span className="text-bh-dim/70"> · {item.square.verificationKind}</span>}
                </div>
                {item.photoUrl && (
                  <a href={item.photoUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={item.photoUrl}
                      alt="evidence"
                      className="rounded max-h-64 ring-1 ring-bh-line"
                    />
                  </a>
                )}
                {item.completion.igUrl && (
                  <a href={item.completion.igUrl} target="_blank" rel="noopener noreferrer" className="text-bh-cyan underline text-sm break-all">
                    {item.completion.igUrl}
                  </a>
                )}
                {item.completion.textAnswer && (
                  <div className="text-sm text-white/80 mt-1 italic">"{item.completion.textAnswer}"</div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => onApprove(item.completion._id)}
                  disabled={busyId === item.completion._id}
                  className="bh-btn-primary text-xs px-3 py-2 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(item.completion._id)}
                  disabled={busyId === item.completion._id}
                  className="bh-display px-3 py-2 rounded-md bg-bh-panel text-bh-magenta ring-1 ring-bh-magenta/40 text-xs tracking-wider hover:bg-bh-magenta/10 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
