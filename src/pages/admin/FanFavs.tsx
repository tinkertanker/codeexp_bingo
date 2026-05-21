import { useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'

export default function FanFavs() {
  return <AdminLayout>{() => <Body />}</AdminLayout>
}

function Body() {
  const data = useQuery(api.fanVotes.detailedTally)
  if (data === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading fan-favs…</p>
  }
  if (data.totalVotes === 0) {
    return <p className="text-sm text-bh-dim">No votes yet.</p>
  }

  return (
    <div className="space-y-3">
      <h2 className="bh-display text-xl font-bold text-white">Fan favourites</h2>
      <p className="text-xs text-bh-dim">
        {data.totalVotes} total vote{data.totalVotes === 1 ? '' : 's'}. Each team can change their pick any time.
      </p>
      <ul className="space-y-2">
        {data.rows.map(({ team, voters }) => (
          <li key={team._id} className="bh-card p-3">
            <div className="flex items-center gap-3">
              <span className={['inline-block w-3 h-3 rounded-full', `bg-team-${team.colour}`].join(' ')} />
              <span className="bh-display text-sm font-bold text-white flex-1 truncate">{team.name}</span>
              <span className="bh-display text-2xl font-extrabold text-bh-lime tabular-nums">{voters.length}</span>
            </div>
            {voters.length > 0 && (
              <div className="text-xs text-bh-dim mt-1">
                Voters: {voters.map((v) => v?.name ?? '(unknown)').join(', ')}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
