import { loadScoreboardPass } from './token'

// The interactive live screen is meant for the venue TVs only. We gate it behind a passcode
// (VITE_SCOREBOARD_PASSCODE) entered once per device and kept in localStorage. This is a
// soft lock — it keeps casual participants on their phones out, not a hard security boundary.
const SCOREBOARD_PASSCODE = import.meta.env.VITE_SCOREBOARD_PASSCODE || ''

export function checkScoreboardPasscode(input: string): boolean {
  if (!SCOREBOARD_PASSCODE) return false
  return input.trim() === SCOREBOARD_PASSCODE
}

export function isScoreboardUnlocked(): boolean {
  const saved = loadScoreboardPass()
  if (!saved) return false
  return checkScoreboardPasscode(saved)
}
