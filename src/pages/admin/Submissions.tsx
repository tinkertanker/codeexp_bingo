import { useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import { categoryLabel } from '../../lib/categories'
import { formatDate } from '../../lib/dates'
import { friendlyError } from '../../lib/errors'
import { problemStatementMission } from '../../lib/problemStatements'

export default function Submissions() {
  return <AdminLayout>{(creds) => <Body mentorName={creds.name} passcode={creds.passcode} />}</AdminLayout>
}

function Body({ mentorName, passcode }: { mentorName: string; passcode: string }) {
  const codeSubs = useQuery(api.codeSubmissions.listAll)
  const aiSubs = useQuery(api.aiSubmissions.listAll)
  const setApproval = useMutation(api.codeSubmissions.setApprovalStatus)
  const checkLink = useAction(api.aiCheck.check)
  const setAiAccessible = useMutation(api.aiSubmissions.setAccessibility)
  const [busy, setBusy] = useState<string | null>(null)
  const [zipBusy, setZipBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (codeSubs === undefined || aiSubs === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading submissions…</p>
  }

  const downloadZip = async (id: string, url: string, filename: string | undefined) => {
    setZipBusy(id)
    setError(null)
    try {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const blob = await resp.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = filename ?? 'submission.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objUrl)
    } catch (e) {
      setError(friendlyError(e, 'ZIP download failed.'))
    }
    setZipBusy(null)
  }

  const onApprove = async (id: (typeof codeSubs)[number]['_id']) => {
    setBusy(id)
    setError(null)
    try {
      await setApproval({ passcode, mentorName, submissionId: id, status: 'approved' })
    } catch (e) {
      setError(friendlyError(e, 'Approve failed.'))
    }
    setBusy(null)
  }

  const onReject = async (id: (typeof codeSubs)[number]['_id']) => {
    setBusy(id)
    setError(null)
    try {
      await setApproval({ passcode, mentorName, submissionId: id, status: 'rejected' })
    } catch (e) {
      setError(friendlyError(e, 'Reject failed.'))
    }
    setBusy(null)
  }

  const onRecheckAi = async (id: (typeof aiSubs)[number]['_id'], url: string) => {
    setBusy(id)
    setError(null)
    try {
      const result = await checkLink({ url })
      await setAiAccessible({ passcode, mentorName, submissionId: id, accessible: result.ok, checkResponse: result })
    } catch (e) {
      setError(friendlyError(e, 'Re-check failed.'))
    }
    setBusy(null)
  }

  const onOverrideAi = async (id: (typeof aiSubs)[number]['_id'], accessible: boolean | undefined) => {
    setBusy(id)
    setError(null)
    try {
      await setAiAccessible({ passcode, mentorName, submissionId: id, accessible })
    } catch (e) {
      setError(friendlyError(e, 'Update failed.'))
    }
    setBusy(null)
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-bh-magenta">{error}</p>}

      <section>
        <h2 className="bh-display text-xl font-bold text-white mb-1">GitHub link submissions</h2>
        <p className="text-xs text-bh-dim mb-3">
          {codeSubs.length} submitted. Approve to grant <strong className="text-bh-lime">+1 lucky draw entry</strong>.
        </p>
        {codeSubs.length === 0 ? (
          <p className="text-sm text-bh-dim">No submissions yet.</p>
        ) : (
          <ul className="space-y-2">
            {codeSubs.map((s) => (
              <li key={s._id} className="bh-card p-3 flex items-center gap-3 flex-wrap">
                <span className={['inline-block w-3 h-3 rounded-full', `bg-team-${s.team?.colour ?? 'red'}`].join(' ')} />
                <div className="flex-1 min-w-0">
                  <div className="bh-display text-sm font-bold text-white truncate">
                    {s.team?.name ?? '(unknown team)'}
                    <span className="ml-2 bh-display text-[0.6rem] tracking-widest text-bh-lime">{categoryLabel(s.team?.category)}</span>
                  </div>
                  <a href={s.githubUrl} target="_blank" rel="noreferrer" className="text-xs text-bh-cyan underline break-all">
                    {s.githubUrl}
                  </a>
                  {s.githubIsPublic !== undefined && (
                    <span className={['ml-2 text-[0.6rem]', s.githubIsPublic ? 'text-bh-lime' : 'text-bh-magenta'].join(' ')}>
                      {s.githubIsPublic ? 'Public' : 'Private/unknown'}
                    </span>
                  )}
                  {s.zipClean !== undefined && (
                    <span className={['ml-2 text-[0.6rem]', s.zipClean ? 'text-bh-lime' : 'text-bh-dim'].join(' ')}>
                      {s.zipClean ? 'ZIP clean' : 'ZIP unverified'}
                    </span>
                  )}
                  {s.zipUrl && (
                    <button
                      onClick={() => downloadZip(s._id, s.zipUrl as string, s.zipFilename)}
                      disabled={zipBusy === s._id}
                      className="ml-2 text-[0.6rem] text-bh-cyan underline disabled:opacity-50"
                    >
                      {zipBusy === s._id ? 'Downloading…' : `⬇ ${s.zipFilename ?? 'Download ZIP'}`}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {s.approvalStatus === 'approved' ? (
                    <span className="bh-display text-[0.65rem] tracking-widest text-bh-lime">APPROVED</span>
                  ) : s.approvalStatus === 'rejected' ? (
                    <span className="bh-display text-[0.65rem] tracking-widest text-bh-magenta">REJECTED</span>
                  ) : (
                    <span className="bh-display text-[0.65rem] tracking-widest text-bh-yellow">PENDING</span>
                  )}
                  <button
                    disabled={busy === s._id || s.approvalStatus === 'approved'}
                    onClick={() => onApprove(s._id)}
                    className="bh-display px-2 py-1 rounded text-[0.6rem] tracking-wider ring-1 ring-bh-lime/40 text-bh-lime hover:bg-bh-lime/10 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy === s._id || s.approvalStatus === 'rejected'}
                    onClick={() => onReject(s._id)}
                    className="bh-display px-2 py-1 rounded text-[0.6rem] tracking-wider ring-1 ring-bh-magenta/40 text-bh-magenta hover:bg-bh-magenta/10 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="bh-display text-xl font-bold text-white mb-1">Innovative use of AI — submissions</h2>
        <p className="text-xs text-bh-dim mb-3">
          {aiSubs.length} submitted. "Accessible" is a best-effort check.
        </p>
        {aiSubs.length === 0 ? (
          <p className="text-sm text-bh-dim">No submissions yet.</p>
        ) : (
          <ul className="space-y-2">
            {aiSubs.map((s) => (
              <li key={s._id} className="bh-card p-3 flex items-center gap-3 flex-wrap">
                <span className={['inline-block w-3 h-3 rounded-full', `bg-team-${s.team?.colour ?? 'red'}`].join(' ')} />
                <div className="flex-1 min-w-0">
                  <div className="bh-display text-sm font-bold text-white truncate">
                    {s.team?.name ?? '(unknown team)'}
                    <span className="ml-2 bh-display text-[0.6rem] tracking-widest text-bh-lime">{categoryLabel(s.team?.category)}</span>
                    <span className="ml-2 bh-display text-[0.6rem] tracking-widest text-bh-cyan">
                      {problemStatementMission(s.team?.problemStatement).toUpperCase()}
                    </span>
                  </div>
                  <a href={s.driveUrl} target="_blank" rel="noreferrer" className="text-xs text-bh-cyan underline break-all">
                    {s.driveUrl}
                  </a>
                  <div className="text-[0.65rem] text-bh-dim mt-0.5">Submitted {formatDate(s.submittedAt)}</div>
                </div>
                <span
                  className={[
                    'bh-display text-[0.65rem] px-2 py-1 rounded ring-1 tracking-wider',
                    s.accessible === true
                      ? 'bg-bh-lime/10 text-bh-lime ring-bh-lime/40'
                      : s.accessible === false
                        ? 'bg-bh-magenta/10 text-bh-magenta ring-bh-magenta/40'
                        : 'bg-bh-panel text-bh-dim ring-bh-line',
                  ].join(' ')}
                >
                  {s.accessible === true ? 'ACCESSIBLE' : s.accessible === false ? 'CHECK FAILED' : 'UNVERIFIED'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onRecheckAi(s._id, s.driveUrl)}
                    disabled={busy === s._id}
                    className="bh-display px-2 py-1 rounded text-[0.6rem] tracking-wider ring-1 ring-bh-line text-bh-dim hover:bg-bh-panel disabled:opacity-40"
                  >
                    {busy === s._id ? '…' : 'Re-check'}
                  </button>
                  {s.accessible !== true ? (
                    <button
                      onClick={() => onOverrideAi(s._id, true)}
                      disabled={busy === s._id}
                      className="bh-display px-2 py-1 rounded text-[0.6rem] tracking-wider ring-1 ring-bh-lime/40 text-bh-lime hover:bg-bh-lime/10 disabled:opacity-40"
                    >
                      Mark accessible
                    </button>
                  ) : (
                    <button
                      onClick={() => onOverrideAi(s._id, undefined)}
                      disabled={busy === s._id}
                      className="bh-display px-2 py-1 rounded text-[0.6rem] tracking-wider ring-1 ring-bh-line text-bh-dim hover:bg-bh-panel disabled:opacity-40"
                    >
                      Mark unverified
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
