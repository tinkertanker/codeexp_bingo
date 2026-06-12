const SESSION_FLAG = 'bingo:admin_session_logged'

function convexSiteUrl(): string {
  const url: string = import.meta.env.VITE_CONVEX_URL || ''
  return url.replace('.convex.cloud', '.convex.site')
}

// POSTs to the Convex HTTP endpoint so the server can also capture the client IP.
// Returns false if the request couldn't be delivered (caller can then fall back).
export async function postAdminLoginHttp(args: {
  passcode: string
  name: string
  path: string
  event: string
}): Promise<boolean> {
  try {
    const res = await fetch(`${convexSiteUrl()}/recordLogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passcode: args.passcode,
        name: args.name,
        userAgent: navigator.userAgent,
        path: args.path,
        event: args.event,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function adminSessionAlreadyLogged(): boolean {
  return sessionStorage.getItem(SESSION_FLAG) === '1'
}

export function markAdminSessionLogged(): void {
  sessionStorage.setItem(SESSION_FLAG, '1')
}
