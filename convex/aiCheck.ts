import { v } from 'convex/values'
import { action } from './_generated/server'

// Best-effort, key-free check that a Google Drive / Docs link is publicly accessible.
// Drive doesn't expose a clean "is this public" signal without the Drive API, so we fetch
// the share URL and look for the tell-tale sign-in / request-access responses. This catches
// the common "forgot to share" mistake; it is NOT a hard security guarantee.
export type AiCheck =
  | { ok: true; accessible: true; title: string | null }
  | { ok: false; accessible: false; reason: string }

function isDriveUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' && /(^|\.)google\.com$/.test(u.hostname) &&
      (u.hostname === 'drive.google.com' || u.hostname === 'docs.google.com')
  } catch {
    return false
  }
}

export const check = action({
  args: { url: v.string() },
  handler: async (_ctx, { url }): Promise<AiCheck> => {
    const trimmed = url.trim()
    if (!isDriveUrl(trimmed)) {
      return { ok: false, accessible: false, reason: 'Use a Google Drive or Google Docs share link (drive.google.com / docs.google.com).' }
    }
    let res: Response
    try {
      res = await fetch(trimmed, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        },
      })
    } catch {
      return { ok: false, accessible: false, reason: "Couldn't reach that link. Check the URL." }
    }
    // Redirected to the Google sign-in flow → not shared publicly.
    try {
      if (new URL(res.url).hostname === 'accounts.google.com') {
        return { ok: false, accessible: false, reason: 'Link needs sign-in. Set sharing to "Anyone with the link".' }
      }
    } catch {
      /* ignore */
    }
    if (res.status === 404) return { ok: false, accessible: false, reason: 'File not found — check the link.' }
    if (!res.ok) return { ok: false, accessible: false, reason: `Google returned ${res.status}.` }

    const body = await res.text()
    const needsAccess = /you need access|request access|sign in to continue|you'll need permission/i.test(body)
    if (needsAccess) {
      return { ok: false, accessible: false, reason: 'Not shared publicly. Set sharing to "Anyone with the link".' }
    }
    const titleMatch = body.match(/<title>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].replace(/\s*-\s*Google (Drive|Docs|Sheets|Slides)\s*$/i, '').trim() : null
    return { ok: true, accessible: true, title: title || null }
  },
})
