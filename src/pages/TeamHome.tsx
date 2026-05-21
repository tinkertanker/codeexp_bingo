import { Link, useParams } from 'react-router-dom'
import BingoGrid from '../components/BingoGrid'
import EligibilityCard from '../components/EligibilityCard'
import FanFavCard from '../components/FanFavCard'
import TeamHeader from '../components/TeamHeader'
import { useTeam } from '../hooks/useTeam'
import { countCompletedLines } from '../lib/lines'
import { effectivelyFilledFor } from '../lib/standings'
import { clearTeamToken } from '../lib/token'

export default function TeamHome() {
  const { token } = useParams()
  const { status, data } = useTeam(token)

  if (status === 'loading') {
    return <div className="p-6 text-bh-dim bh-display text-xs">Loading…</div>
  }

  if (status === 'not_found') {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h1 className="bh-display text-xl font-bold mb-2">Team not found</h1>
        <p className="text-sm text-bh-dim mb-4">
          That magic link doesn't match any team. Check with a mentor on Discord, or scan your team's QR card.
        </p>
        <button
          onClick={() => {
            clearTeamToken()
            window.location.href = '/'
          }}
          className="px-3 py-2 rounded-md ring-1 ring-bh-line bg-bh-panel text-sm hover:bg-bh-surface"
        >
          Forget this device
        </button>
      </div>
    )
  }

  if (!data) {
    return <div className="p-6 text-bh-magenta">Could not load team data.</div>
  }

  const effectivelyFilled = effectivelyFilledFor(data.team, data.squares, data.completions)
  const lines = countCompletedLines(effectivelyFilled)
  const entries = lines

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <TeamHeader team={data.team} lines={lines} entries={entries} />
        {!data.gameOpen && (
          <div className="mb-3 p-3 rounded-md ring-1 ring-bh-yellow/40 bg-bh-yellow/10 text-bh-yellow text-sm">
            <strong className="bh-display tracking-wider">Game paused.</strong> You can browse your card but can't submit new squares right now.
          </div>
        )}
        <BingoGrid
          team={data.team}
          squares={data.squares}
          completions={data.completions}
          hrefForSquare={(sq) => `/t/${data.team.token}/square/${sq.position}`}
        />
        <EligibilityCard team={data.team} squares={data.squares} />
        <FanFavCard team={data.team} />
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link to={`/t/${data.team.token}/project`} className="bh-btn-primary text-sm">
            Project submission
          </Link>
          <Link to="/scoreboard" className="bh-btn-ghost text-sm">
            Scoreboard
          </Link>
        </div>
      </div>
    </div>
  )
}
