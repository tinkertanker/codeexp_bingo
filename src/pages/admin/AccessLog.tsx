import { useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'

export default function AccessLog() {
  return <AdminLayout>{(creds) => <Body passcode={creds.passcode} />}</AdminLayout>
}

// Render the timestamp in Singapore time (the event timezone) regardless of viewer locale.
function formatSgt(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(ms))
}

function Body({ passcode }: { passcode: string }) {
  const rows = useQuery(api.adminAccess.list, { passcode })
  if (rows === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading access log…</p>
  }
  return (
    <div className="space-y-4">
      <div>
        <h2 className="bh-display text-xl font-bold text-white">Admin access log</h2>
        <p className="text-xs text-bh-dim max-w-2xl">
          Every admin sign-in (and the first admin access per browser session) is recorded here with name, time
          (SGT), best-effort IP and device. This log is append-only and is <strong className="text-white">not</strong>{' '}
          cleared by &ldquo;Reset all progress&rdquo;.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-bh-dim">No logins recorded yet.</p>
      ) : (
        <div className="overflow-x-auto bh-card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bh-display text-[0.65rem] tracking-wider text-bh-dim border-b border-bh-line">
                <th className="px-3 py-2">Time (SGT)</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Device</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-bh-line/40 align-top">
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap text-white">{formatSgt(r.at)}</td>
                  <td className="px-3 py-2 bh-display tracking-wider text-bh-lime whitespace-nowrap">{r.name}</td>
                  <td className="px-3 py-2 text-bh-dim">{r.event ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums text-bh-dim whitespace-nowrap">{r.ip ?? '—'}</td>
                  <td className="px-3 py-2 text-[0.7rem] text-bh-dim max-w-xs truncate" title={r.userAgent ?? ''}>
                    {r.userAgent ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
