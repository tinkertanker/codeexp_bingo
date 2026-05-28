const TOKEN_KEY = 'bingo:team_token'
const ADMIN_NAME_KEY = 'bingo:admin_name'
const ADMIN_PASS_KEY = 'bingo:admin_pass'
const SCOREBOARD_PASS_KEY = 'bingo:scoreboard_pass'

export function loadTeamToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveTeamToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearTeamToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function loadAdminCreds(): { name: string; passcode: string } | null {
  const name = localStorage.getItem(ADMIN_NAME_KEY)
  const passcode = localStorage.getItem(ADMIN_PASS_KEY)
  if (!name || !passcode) return null
  return { name, passcode }
}

export function saveAdminCreds(name: string, passcode: string): void {
  localStorage.setItem(ADMIN_NAME_KEY, name)
  localStorage.setItem(ADMIN_PASS_KEY, passcode)
}

export function clearAdminCreds(): void {
  localStorage.removeItem(ADMIN_NAME_KEY)
  localStorage.removeItem(ADMIN_PASS_KEY)
}

export function loadScoreboardPass(): string | null {
  return localStorage.getItem(SCOREBOARD_PASS_KEY)
}

export function saveScoreboardPass(pass: string): void {
  localStorage.setItem(SCOREBOARD_PASS_KEY, pass)
}
