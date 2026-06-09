import { v } from 'convex/values'
import { action } from './_generated/server'

// Best-effort, key-free check that a Google Drive / Docs link is publicly accessible.
// Drive doesn't expose a clean "is this public" signal without the Drive API, so we fetch
// the share URL and look for the tell-tale sign-in / request-access responses. This catches
// the common "forgot to share" mistake; it is NOT a hard security guarantee.
export type AiCheck =
  | { ok: true; accessible: true; title: string | null }
  | { ok: false; accessible: false; reason: string }

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'

function isDriveUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' && /(^|\.)google\.com$/.test(u.hostname) &&
      (u.hostname === 'drive.google.com' || u.hostname === 'docs.google.com')
  } catch {
    return false
  }
}

function chatCompletionsUrl(): string {
  const raw = (process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).trim().replace(/\/+$/, '')
  if (raw.endsWith('/chat/completions')) return raw
  return `${raw}/chat/completions`
}

async function complain(reason: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return reason

  try {
    const res = await fetch(chatCompletionsUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
        temperature: 0.7,
        max_tokens: 80,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise event submission checker. Rewrite the failure reason as a playful but helpful complaint. Do not insult the team. Keep it under 35 words.',
          },
          {
            role: 'user',
            content: `Failure reason: ${reason}`,
          },
        ],
      }),
    })
    if (!res.ok) return reason
    const body = await res.json()
    const content = body?.choices?.[0]?.message?.content
    if (typeof content !== 'string') return reason
    return content.trim() || reason
  } catch {
    return reason
  }
}

export const check = action({
  args: { url: v.string() },
  handler: async (_ctx, { url }): Promise<AiCheck> => {
    const trimmed = url.trim()
    if (!isDriveUrl(trimmed)) {
      return {
        ok: false,
        accessible: false,
        reason: await complain('Use a Google Drive or Google Docs share link (drive.google.com / docs.google.com).'),
      }
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
      return { ok: false, accessible: false, reason: await complain("Couldn't reach that link. Check the URL.") }
    }
    // Redirected to the Google sign-in flow → not shared publicly.
    try {
      if (new URL(res.url).hostname === 'accounts.google.com') {
        return {
          ok: false,
          accessible: false,
          reason: await complain('Link needs sign-in. Set sharing to "Anyone with the link".'),
        }
      }
    } catch {
      /* ignore */
    }
    if (res.status === 404) return { ok: false, accessible: false, reason: await complain('File not found — check the link.') }
    if (res.status === 401) return { ok: false, accessible: false, reason: await complain('Google returned a 401 error. Please check that the link is publicly accessible (set sharing to "Anyone with the link").') }
    if (!res.ok) return { ok: false, accessible: false, reason: await complain(`Google returned ${res.status}.`) }

    const body = await res.text()
    const needsAccess = /you need access|request access|sign in to continue|you'll need permission/i.test(body)
    if (needsAccess) {
      return {
        ok: false,
        accessible: false,
        reason: await complain('Not shared publicly. Set sharing to "Anyone with the link".'),
      }
    }
    const titleMatch = body.match(/<title>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].replace(/\s*-\s*Google (Drive|Docs|Sheets|Slides)\s*$/i, '').trim() : null
    return { ok: true, accessible: true, title: title || null }
  },
})
