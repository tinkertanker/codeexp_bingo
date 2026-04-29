import { v } from 'convex/values'
import { action } from './_generated/server'

type GithubCheck =
  | { ok: true; isPublic: true; defaultBranch: string; description: string | null }
  | { ok: false; isPublic: false; reason: string }

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?(?:[#?].*)?$/i)
  if (!m) return null
  return { owner: m[1], repo: m[2] }
}

export const check = action({
  args: { url: v.string() },
  handler: async (_ctx, { url }): Promise<GithubCheck> => {
    const parts = parseGithubUrl(url)
    if (!parts) return { ok: false, isPublic: false, reason: "Doesn't look like a GitHub repo URL." }
    const res = await fetch(`https://api.github.com/repos/${parts.owner}/${parts.repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (res.status === 404) return { ok: false, isPublic: false, reason: 'Repo not found or is private.' }
    if (res.status === 403) return { ok: false, isPublic: false, reason: 'GitHub rate-limited the check. Try again in a minute.' }
    if (!res.ok) return { ok: false, isPublic: false, reason: `GitHub returned ${res.status}.` }
    const data = (await res.json()) as { private?: boolean; default_branch?: string; description?: string | null }
    if (data.private) return { ok: false, isPublic: false, reason: 'Repo is private. Make it public to submit.' }
    return {
      ok: true,
      isPublic: true,
      defaultBranch: data.default_branch ?? 'main',
      description: data.description ?? null,
    }
  },
})
