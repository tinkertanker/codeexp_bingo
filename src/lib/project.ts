import JSZip from 'jszip'
import { supabase } from './supabase'

const ZIP_BUCKET = 'code-zips'
const MAX_FILE_BYTES = 50 * 1024 * 1024
const FORBIDDEN_PATTERNS = [/(^|\/)node_modules\//i, /(^|\/)\.venv\//i, /(^|\/)\.git\//i, /(^|\/)dist\//i, /(^|\/)build\//i]

export type GithubUrlParts = { owner: string; repo: string }

export function parseGithubUrl(url: string): GithubUrlParts | null {
  const m = url.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?(?:[#?].*)?$/i)
  if (!m) return null
  return { owner: m[1], repo: m[2] }
}

export type GithubCheck =
  | { ok: true; isPublic: true; defaultBranch: string; description: string | null }
  | { ok: false; isPublic: false; reason: string; raw?: unknown }

export async function checkGithubRepo(url: string): Promise<GithubCheck> {
  const parts = parseGithubUrl(url)
  if (!parts) return { ok: false, isPublic: false, reason: "Doesn't look like a GitHub repo URL." }
  const res = await fetch(`https://api.github.com/repos/${parts.owner}/${parts.repo}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (res.status === 404) {
    return { ok: false, isPublic: false, reason: 'Repo not found or is private.' }
  }
  if (res.status === 403) {
    return { ok: false, isPublic: false, reason: "GitHub rate-limited the check. Try again in a minute." }
  }
  if (!res.ok) {
    return { ok: false, isPublic: false, reason: `GitHub returned ${res.status}.` }
  }
  const data = (await res.json()) as { private?: boolean; default_branch?: string; description?: string | null }
  if (data.private) {
    return { ok: false, isPublic: false, reason: 'Repo is private. Make it public to submit.', raw: data }
  }
  return {
    ok: true,
    isPublic: true,
    defaultBranch: data.default_branch ?? 'main',
    description: data.description ?? null,
  }
}

export type ZipCheck =
  | { ok: true; fileCount: number; totalBytes: number }
  | { ok: false; reason: string; offenders?: string[] }

export async function inspectZip(file: File): Promise<ZipCheck> {
  if (file.size > MAX_FILE_BYTES * 4) {
    return { ok: false, reason: `ZIP is ${(file.size / 1024 / 1024).toFixed(1)} MB — too big. Trim it down before uploading.` }
  }
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch (e) {
    return { ok: false, reason: `Couldn't read the ZIP: ${e instanceof Error ? e.message : String(e)}` }
  }
  const offenders: string[] = []
  let fileCount = 0
  let totalBytes = 0
  zip.forEach((path, entry) => {
    fileCount += 1
    const uncompressed = (entry as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0
    totalBytes += uncompressed
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(path)) {
        offenders.push(path)
        break
      }
    }
    if (uncompressed > MAX_FILE_BYTES) {
      offenders.push(`${path} (${(uncompressed / 1024 / 1024).toFixed(1)} MB)`)
    }
  })
  if (offenders.length > 0) {
    return {
      ok: false,
      reason: `ZIP contains paths we don't want: ${offenders.slice(0, 3).join(', ')}${offenders.length > 3 ? '…' : ''}`,
      offenders,
    }
  }
  return { ok: true, fileCount, totalBytes }
}

export type UploadZipResult = { ok: true; path: string } | { ok: false; reason: string }

export async function uploadZip(teamId: string, file: File): Promise<UploadZipResult> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const path = `${teamId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from(ZIP_BUCKET).upload(path, file, {
    contentType: file.type || 'application/zip',
    upsert: false,
  })
  if (error) return { ok: false, reason: error.message }
  return { ok: true, path }
}

export function publicZipUrl(path: string): string {
  return supabase.storage.from(ZIP_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function saveSubmission(args: {
  team_id: string
  github_url: string
  github_is_public: boolean | null
  github_check_response: unknown
  zip_storage_path: string | null
  zip_clean: boolean | null
  zip_check_response: unknown
}): Promise<{ ok: boolean; reason?: string }> {
  const { error } = await supabase
    .from('code_submissions')
    .upsert(
      { ...args, updated_at: new Date().toISOString() },
      { onConflict: 'team_id' },
    )
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

export async function loadSubmission(teamId: string) {
  const { data, error } = await supabase
    .from('code_submissions')
    .select('*')
    .eq('team_id', teamId)
    .maybeSingle()
  if (error) return null
  return data
}
