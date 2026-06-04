/**
 * Strip the Convex server error wrapper so the user only sees the human-readable part.
 *
 * Convex errors look like:
 *   [CONVEX M(module:function)] [Request ID: abc123] Server Error
 *   Uncaught Error: <message>
 *
 * We want just <message>.
 */
export function cleanConvexError(raw: string): string {
  const serverIdx = raw.indexOf('Server Error')
  const stripped = serverIdx >= 0 ? raw.slice(serverIdx + 'Server Error'.length).trim() : raw
  return stripped
    .replace(/^Uncaught Error:\s*/, '')
    .replace(/^Error:\s*/, '')
    .trim()
}

/** Convenience: extract + clean the error message from an unknown catch value. */
export function friendlyError(e: unknown, fallback = 'Something went wrong.'): string {
  const msg = e instanceof Error ? e.message : String(e)
  return cleanConvexError(msg) || fallback
}
