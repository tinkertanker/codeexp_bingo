import type { StorageId } from './types'

// Uploads a Blob/File to Convex storage given an upload URL produced by `api.upload.generateUploadUrl`.
// Returns the storageId Convex assigns, which then gets handed to whichever mutation persists it.
export async function uploadToConvex(uploadUrl: string, file: File): Promise<{ ok: true; storageId: StorageId } | { ok: false; reason: string }> {
  try {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    })
    if (!res.ok) return { ok: false, reason: `Upload failed: ${res.status}` }
    const { storageId } = (await res.json()) as { storageId: StorageId }
    return { ok: true, storageId }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}
