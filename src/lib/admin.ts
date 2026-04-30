import { loadAdminCreds } from './token'

export type AdminCreds = { name: string; passcode: string }

const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || ''
const ORGANISER_NAMES: string[] = (import.meta.env.VITE_ORGANISER_NAMES || '')
  .split(',')
  .map((s: string) => s.trim())
  .filter((s: string) => s.length > 0)
  .map((s: string) => s.toLowerCase())

// Client-side gate so we don't drop the user into the admin UI without a passcode.
// The Convex server independently enforces the passcode + organiser checks on every mutation.
export function checkPasscode(input: string): boolean {
  if (!ADMIN_PASSCODE) return false
  return input.trim() === ADMIN_PASSCODE
}

export function requireAdmin(): AdminCreds | null {
  const creds = loadAdminCreds()
  if (!creds) return null
  if (!checkPasscode(creds.passcode)) return null
  return creds
}

export function isOrganiser(name: string): boolean {
  return ORGANISER_NAMES.includes(name.trim().toLowerCase())
}
