import { useQuery } from 'convex/react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../../convex/_generated/api'
import { categoryLabel } from '../../lib/categories'
import type { TeamCategory } from '../../lib/types'

export default function FanFavs() {
  return <AdminLayout>{() => <Body />}</AdminLayout>
}

function Body() {
  const data = useQuery(api.fanVotes.tallyByCategory)
  if (data === undefined) {
    return <p className="text-sm text-bh-dim bh-display">Loading fan-favs…</p>
  }
  return (
    <div className="space-y-6">
      <div>
        <h2 className="bh-display text-xl font-bold text-white">Fan favourites</h2>
        <p className="text-xs text-bh-dim">
          Each team ranks a top 3 per category. Points: 1st = 3, 2nd = 2, 3rd = 1.
        </p>
      </div>
      <Board category="cat1" board={data.cat1} />
      <Board category="cat2" board={data.cat2} />
    </div>
  )
}

type Row = {
  team: { _id: string; name: string; colour: string }
  points: number
  first: number
  second: number
  third: number
}

function Board({
  category,
  board,
}: {
  category: TeamCategory
  board: { rows: Row[]; ballots: number }
}) {
  return (
    <section>
      <h3 className="bh-display text-sm font-bold text-bh-lime mb-2 tracking-wider">
        {categoryLabel(category)}{' '}
        <span className="text-bh-dim font-normal">
          — {board.ballots} ballot{board.ballots === 1 ? '' : 's'}
        </span>
      </h3>
      {board.rows.length === 0 ? (
        <p className="text-sm text-bh-dim">No votes yet.</p>
      ) : (
        <ol className="space-y-2">
          {board.rows.map((r, i) => (
            <li key={r.team._id} className="bh-card p-3 flex items-center gap-3">
              <span className="bh-display w-5 text-right text-xs text-bh-dim tabular-nums">{i + 1}</span>
              <span className={['inline-block w-3 h-3 rounded-full', `bg-team-${r.team.colour}`].join(' ')} />
              <span className="bh-display text-sm font-bold text-white flex-1 truncate">{r.team.name}</span>
              <span className="text-[0.65rem] text-bh-dim tabular-nums">
                {r.first}×1st · {r.second}×2nd · {r.third}×3rd
              </span>
              <span className="bh-display text-2xl font-extrabold text-bh-lime tabular-nums">{r.points}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
