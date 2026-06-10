import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BingoGrid from '../components/BingoGrid'
import EligibilityCard from '../components/EligibilityCard'
import FanFavCard from '../components/FanFavCard'
import TeamHeader from '../components/TeamHeader'
import { useTeam } from '../hooks/useTeam'
import { countCompletedLines } from '../lib/lines'
import { effectivelyFilledFor } from '../lib/standings'
import { effectiveCategory } from '../lib/squares'
import { clearTeamToken, loadTeamToken } from '../lib/token'

export default function TeamHome() {
  const { token } = useParams()
  const { status, data } = useTeam(token)
  const [showInstructions, setShowInstructions] = useState(false)

  const storedToken = loadTeamToken()
  const isWrongTeam = !!(storedToken && token && storedToken !== token)

  if (isWrongTeam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bh-card p-8 text-center">
          <h1 className="bh-display text-xl font-bold text-bh-magenta mb-3">Wrong team link</h1>
          <p className="text-sm text-bh-dim mb-6">
            This link belongs to another team. To complete a bingo square, go back to
            your own team page and use the <strong className="text-white">in-app QR scanner</strong>.
          </p>
          <a href={`/t/${storedToken}`} className="bh-btn-primary w-full text-sm">
            Back to my team
          </a>
        </div>
      </div>
    )
  }

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
  const zipBonus = data.zipClean ? 1 : 0
  const githubBonus = data.githubApproved ? 1 : 0
  const eligibilityBonus = data.eligibilities.filter((e) => e.status === 'approved').length
  const entries = lines + zipBonus + githubBonus + eligibilityBonus

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <TeamHeader team={data.team} lines={lines} entries={entries} />
        <button
          onClick={() => setShowInstructions(true)}
          className="mb-3 w-full bh-btn-ghost text-sm flex items-center justify-center gap-1.5"
        >
          <span className="text-base leading-none">?</span> How to play
        </button>
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
        {data.githubRejected && (
          <div className="mt-3 p-3 rounded-md ring-1 ring-red-500/40 bg-red-500/10 text-red-400 text-sm">
            <strong className="bh-display tracking-wider">GitHub submission rejected.</strong>{' '}
            Please re-submit your GitHub link. Talk to your mentor for details.
          </div>
        )}
        {data.completions
          .filter((c) => c.status === 'rejected')
          .map((c) => {
            const sq = data.squares.find((s) => s._id === c.squareId)
            return (
              <div key={c._id} className="mt-3 p-3 rounded-md ring-1 ring-red-500/40 bg-red-500/10 text-red-400 text-sm">
                <strong className="bh-display tracking-wider">Submission rejected{sq ? ` — ${sq.title}` : ''}.</strong>{' '}
                {c.rejectedReason
                  ? <>Reason: {c.rejectedReason}</>
                  : <>Talk to your mentor for details.</>}{' '}
                You can re-submit from the square.
              </div>
            )
          })
        }
        <div className="mt-6">
          <h2 className="bh-display text-xs tracking-wider text-bh-dim mb-2">CODE_EXP actions</h2>
          <div className="grid grid-cols-2 gap-2">
          <Link to={`/t/${data.team.token}/project`} className="bh-btn-primary text-sm text-center">
            Project submission
          </Link>
          {effectiveCategory(data.team) === 'cat2' && (
            <Link to={`/t/${data.team.token}/ai-submission`} className="bh-btn-primary text-sm text-center">
              Innovative use of AI
            </Link>
          )}
          </div>
        </div>
        {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      </div>
    </div>
  )
}

function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto" onClick={onClose}>
      <div className="bh-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="bh-display text-lg font-bold text-white">How to play</h2>
          <button onClick={onClose} className="text-bh-dim hover:text-white text-xl leading-none px-2" aria-label="Close">x</button>
        </div>
        <div className="space-y-4 text-sm text-white/90">
          <section>
            <h3 className="bh-display text-xs tracking-wider text-bh-lime mb-1">Objectives</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-bh-dim">
              <li>Complete a task to earn the square</li>
              <li>Each line complete = 1 lucky draw opportunity</li>
              <li>Some tasks will be released throughout the event</li>
              <li>Deadline: <strong className="text-white">15:30, 11/06/2026</strong></li>
            </ul>
          </section>
          <section>
            <h3 className="bh-display text-xs tracking-wider text-bh-dim mb-1">Grey tasks</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-bh-dim">
              <li>Scan QR codes at specific times</li>
              <li>If missed, these squares will be <strong className="text-bh-magenta">permanently locked</strong></li>
            </ul>
          </section>
          <section>
            <h3 className="bh-display text-xs tracking-wider text-bh-cyan mb-1">Blue tasks</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-bh-dim">
              <li>Teams are divided into 5 colour groups</li>
              <li>Find a team from a different colour group for each mission</li>
              <li>The approached team presents their QR code for you to scan</li>
              <li>Each team can be approached a maximum of <strong className="text-white">10 times for blue squares</strong></li>
            </ul>
          </section>
          <section>
            <h3 className="bh-display text-xs tracking-wider text-red-500 mb-1">Red tasks</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-bh-dim">
              <li>Declare you've completed these features using the buttons in-app</li>
              <li>Your mentor will confirm — each confirmed feature grants an <strong className="text-bh-lime">extra lucky draw chance!</strong></li>
              <li>To earn the square, scan the QR of another team that has implemented each feature</li>
            </ul>
          </section>
          <section>
            <h3 className="bh-display text-xs tracking-wider text-bh-lime mb-1">Green tasks</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-bh-dim">
              <li>Upload a picture into the system</li>
              <li>Once approved, your square will be earned!</li>
            </ul>
          </section>
        </div>
        <button onClick={onClose} className="mt-5 w-full bh-btn-primary text-sm">Got it!</button>
      </div>
    </div>
  )
}
