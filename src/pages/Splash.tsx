import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadTeamToken } from '../lib/token'

export default function Splash() {
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const token = loadTeamToken()
    if (token) navigate(`/t/${token}`, { replace: true })
    else setShowHelp(true)
  }, [navigate])

  if (!showHelp) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-200">
      <h1 className="text-4xl font-bold mb-2">BrainHack Bingo</h1>
      <p className="text-slate-600 mb-8 text-center">
        You need a magic link to play. Check your team's Discord channel — or ask a mentor.
      </p>
      <div className="bg-white rounded-xl shadow p-6 max-w-md w-full">
        <p className="text-sm text-slate-700 mb-4">
          Already have a magic link? It looks like <code>/t/&lt;token&gt;</code>. Open it on this device and you'll be logged in as your team.
        </p>
        <Link
          to="/scoreboard"
          className="block text-center w-full py-3 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700"
        >
          View live scoreboard
        </Link>
      </div>
    </div>
  )
}
