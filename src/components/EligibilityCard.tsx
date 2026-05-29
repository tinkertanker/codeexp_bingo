import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { BingoSquare, BingoSquareId, Team, TeamEligibility } from '../lib/types'

// (4a) Self-declared eligibility for orange "find a team that did X" squares.
// Team taps "Declare we qualify" → pending → mentor approves on /admin/queue → approved.
export default function EligibilityCard({ team, squares }: { team: Team; squares: BingoSquare[] }) {
  const myEligibilities = useQuery(api.eligibility.listForTeam, { teamId: team._id })
  const declare = useMutation(api.eligibility.declare)
  const withdraw = useMutation(api.eligibility.withdraw)
  const [busyId, setBusyId] = useState<BingoSquareId | null>(null)
  const [error, setError] = useState<string | null>(null)

  const orangeSquares = squares.filter((s) => s.category === 'orange')

  if (orangeSquares.length === 0) return null
  if (myEligibilities === undefined) {
    return (
      <section className="mt-4 bh-card p-3">
        <p className="text-xs text-bh-dim bh-display">Loading eligibility…</p>
      </section>
    )
  }

  const byId = new Map<string, TeamEligibility>()
  for (const e of myEligibilities) byId.set(e.squareId, e)

  const onDeclare = async (squareId: BingoSquareId) => {
    setBusyId(squareId)
    setError(null)
    try {
      await declare({ teamId: team._id, squareId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Declaration failed.')
    }
    setBusyId(null)
  }

  const onWithdraw = async (squareId: BingoSquareId) => {
    setBusyId(squareId)
    setError(null)
    try {
      await withdraw({ teamId: team._id, squareId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdraw failed.')
    }
    setBusyId(null)
  }

  return (
    <section className="mt-4 bh-card p-3">
      <h3 className="bh-display text-sm font-bold text-white mb-1">Your declared challenges</h3>
      <p className="text-xs text-bh-dim mb-2">
        Tell your mentor which red challenges your project qualifies for. Your mentor will validate your feature and approve so other teams can scan you. Each approved feature grants <strong className="text-bh-lime">+1 lucky draw entry</strong>!
      </p>
      <ul className="space-y-1.5">
        {orangeSquares.map((sq) => {
          const e = byId.get(sq._id)
          return (
            <li
              key={sq._id}
              className="flex items-center gap-2 rounded ring-1 ring-bh-line bg-black/30 px-2 py-1.5"
            >
              <span className="text-xs text-white flex-1 truncate">{sq.title}</span>
              {e?.status === 'approved' && (
                <span className="bh-display text-[0.6rem] tracking-widest text-bh-lime">APPROVED ✓</span>
              )}
              {e?.status === 'pending' && (
                <>
                  <span className="bh-display text-[0.6rem] tracking-widest text-bh-yellow">PENDING…</span>
                  <button
                    disabled={busyId === sq._id}
                    onClick={() => onWithdraw(sq._id)}
                    className="bh-display text-[0.6rem] tracking-wider text-bh-dim hover:text-bh-magenta disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
              {e?.status === 'rejected' && (
                <div className="flex flex-col items-end gap-1">
                  <span className="bh-display text-[0.6rem] tracking-widest text-bh-magenta">
                    REJECTED
                  </span>
                  {e.rejectedReason && (
                    <span className="text-[0.6rem] text-bh-dim italic max-w-[10rem] text-right leading-tight">
                      Reason: {e.rejectedReason}
                    </span>
                  )}
                  <button
                    disabled={busyId === sq._id}
                    onClick={() => onDeclare(sq._id)}
                    className="bh-display text-[0.6rem] tracking-wider text-bh-lime hover:text-white disabled:opacity-50"
                  >
                    Re-declare
                  </button>
                </div>
              )}
              {!e && (
                <button
                  disabled={busyId === sq._id}
                  onClick={() => onDeclare(sq._id)}
                  className="bh-display px-2 py-0.5 rounded text-[0.6rem] tracking-wider ring-1 ring-bh-lime/40 text-bh-lime hover:bg-bh-lime/10 disabled:opacity-50"
                >
                  Declare
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="text-xs text-bh-magenta mt-1">{error}</p>}
    </section>
  )
}
