export function teamMagicLink(token: string): string {
  if (typeof window === 'undefined') return `/t/${token}`
  return `${window.location.origin}/t/${token}`
}

export function parseTeamToken(scanned: string): string | null {
  if (!scanned) return null
  const m = scanned.match(/\/t\/([A-Za-z0-9_-]+)/)
  if (m) return m[1]
  if (/^[A-Za-z0-9_-]{8,}$/.test(scanned)) return scanned
  return null
}
