import JSZip from 'jszip'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const FORBIDDEN_PATTERNS = [/(^|\/)node_modules\//i, /(^|\/)\.venv\//i, /(^|\/)\.git\//i, /(^|\/)dist\//i, /(^|\/)build\//i]

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
