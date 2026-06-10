import { useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { categoryLabel } from '../../lib/categories'
import { formatDate } from '../../lib/dates'
import { friendlyError } from '../../lib/errors'
import { problemStatementMission } from '../../lib/problemStatements'

export default function AiSubmissions() {
  return <AdminLayout>{(creds) => <Body mentorName={creds.name} passcode={creds.passcode} />}</AdminLayout>
}

function Body({ mentorName, passcode }: { mentorName: string; passcode: string }) {
  const subs = useQuery(api.aiSubmissions.listAll)
  const checkLink = useAction(api.aiCheck.check)
  const setAccessibility = useMutation(api.aiSubmissions.setAccessibility)
  const [busyId, setBusyId] = useState<Id<'aiSubmissions'> | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (subs === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading submissions…</p>
  }

  const recheck = async (id: Id<'aiSubmissions'>, url: string) => {
    setBusyId(id)
    setError(null)
    try {
      const result = await checkLink({ url })
      await setAccessibility({ passcode, mentorName, submissionId: id, accessible: result.ok, checkResponse: result })
    } catch (e) {
      setError(friendlyError(e, 'Re-check failed.'))
    }
    setBusyId(null)
  }

  const override = async (id: Id<'aiSubmissions'>, accessible: boolean | undefined) => {
    setBusyId(id)
    setError(null)
    try {
      await setAccessibility({ passcode, mentorName, submissionId: id, accessible })
    } catch (e) {
      setError(friendlyError(e, 'Update failed.'))
    }
    setBusyId(null)
  }

  return (
    <div className="space-y-3">
      <h2 className="bh-display text-xl font-bold text-white">Innovative use of AI — submissions</h2>
      <p className="text-xs text-bh-dim">
        {subs.length} submitted. "Accessible" is a best-effort public-link check, not a guarantee — use Re-check or the
        manual override if a link you can open is showing as Unverified.
      </p>
      {error && <p className="text-sm text-bh-magenta">{error}</p>}
      {subs.length === 0 ? (
        <p className="text-sm text-bh-dim">No submissions yet.</p>
      ) : (
        <ul className="space-y-2">
          {subs.map((s) => (
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
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => recheck(s._id, s.driveUrl)}
                  disabled={busyId === s._id}
                  className="bh-btn-ghost text-xs disabled:opacity-50"
                >
                  {busyId === s._id ? '…' : 'Re-check'}
                </button>
                {s.accessible !== true && (
                  <button
                    onClick={() => override(s._id, true)}
                    disabled={busyId === s._id}
                    className="text-xs px-2 py-1 rounded ring-1 ring-bh-lime/40 text-bh-lime hover:bg-bh-lime/10 disabled:opacity-50"
                  >
                    Mark accessible
                  </button>
                )}
                {s.accessible === true && (
                  <button
                    onClick={() => override(s._id, undefined)}
                    disabled={busyId === s._id}
                    className="text-xs px-2 py-1 rounded ring-1 ring-bh-line text-bh-dim hover:bg-bh-panel disabled:opacity-50"
                  >
                    Mark unverified
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
