import { useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import { categoryLabel } from '../../lib/categories'
import { problemStatementMission } from '../../lib/problemStatements'

export default function AiSubmissions() {
  return <AdminLayout>{() => <Body />}</AdminLayout>
}

function Body() {
  const subs = useQuery(api.aiSubmissions.listAll)
  if (subs === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading submissions…</p>
  }
  return (
    <div className="space-y-3">
      <h2 className="bh-display text-xl font-bold text-white">Innovative use of AI — submissions</h2>
      <p className="text-xs text-bh-dim">
        {subs.length} submitted. "Accessible" is a best-effort public-link check, not a guarantee.
      </p>
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
                <div className="text-[0.65rem] text-bh-dim mt-0.5">Submitted {new Date(s.submittedAt).toLocaleString()}</div>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
