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
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="relative max-w-md w-full">
        {/* Glitch stripe accents */}
        <div className="absolute -top-3 left-12 h-1 w-20 bg-bh-lime" />
        <div className="absolute -top-1 left-36 h-1 w-10 bg-bh-magenta" />
        <div className="absolute -bottom-3 right-8 h-1 w-24 bg-bh-orange" />
        <div className="absolute -bottom-1 right-40 h-1 w-12 bg-bh-cyan" />

        <div className="bh-card p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
               style={{ backgroundImage: 'linear-gradient(#A6FB00 1px, transparent 1px), linear-gradient(90deg, #A6FB00 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

          <img
            src="/code-exp-logo.png"
            alt="CODE_EXP"
            className="w-24 h-24 mx-auto mb-4 drop-shadow-[0_0_24px_rgba(166,251,0,0.45)]"
          />
          <div className="bh-display text-bh-dim text-xs mb-2">— BrainHack 2026 —</div>
          <h1 className="bh-display text-3xl font-extrabold mb-1 text-white">
            CODE_EXP <span className="text-bh-lime">FINALS</span>
          </h1>
          <p className="text-bh-dim text-sm mb-6">
            You need a magic link for your team hub. Check your team's Discord channel — or ask a mentor.
          </p>
          <p className="text-xs text-bh-dim/80 mb-6">
            Already have one? It looks like <code className="font-mono text-bh-lime">/t/&lt;token&gt;</code>. Open it on this device and you'll be logged in as your team.
          </p>
          <Link to="/live" className="bh-btn-primary w-full">
            View live screen
          </Link>
        </div>
      </div>
    </div>
  )
}
