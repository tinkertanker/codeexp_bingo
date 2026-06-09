import { useParams } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { loadTeamToken } from '../lib/token'

export default function ScanLanding() {
  const { token } = useParams()
  const scannedTeam = useQuery(api.teams.getByToken, token ? { token } : 'skip')
  const ownToken = loadTeamToken()

  const teamLabel = scannedTeam?.name ?? 'a team'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bh-card p-8 text-center">
        <img
          src="/code-exp-logo.png"
          alt="CODE_EXP"
          className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_24px_rgba(166,251,0,0.45)]"
        />
        <h1 className="bh-display text-xl font-bold text-white mb-3">
          You scanned {teamLabel}
        </h1>
        <p className="text-sm text-bh-dim mb-6">
          To complete a bingo square, open the bingo app on your phone and use
          the <strong className="text-white">in-app QR scanner</strong> on the
          square you want to complete.
        </p>
        {ownToken ? (
          <a
            href={`/t/${ownToken}`}
            className="bh-btn-primary w-full text-sm"
          >
            Go to my bingo card
          </a>
        ) : (
          <p className="text-xs text-bh-dim">
            Don't have a team yet? Ask a mentor for your magic link.
          </p>
        )}
      </div>
    </div>
  )
}
