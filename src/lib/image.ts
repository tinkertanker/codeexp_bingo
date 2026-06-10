// Prepares a user-selected photo for upload so it renders everywhere.
//
// iPhones default to HEIC, which browsers (other than Safari) can't decode, so
// such uploads show as broken images on the admin queue, photo wall, etc. Here
// we convert HEIC -> JPEG in the browser (via heic-to / a recent libheif-wasm,
// loaded lazily only when needed) and downscale very large photos to keep
// uploads fast. heic-to is used over heic2any because its newer libheif decodes
// Apple HDR "gain-map" HEICs (brand `tmap`) that the older build chokes on.

const HEIC_MIME_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']

const MAX_DIMENSION = 2000
const JPEG_QUALITY = 0.85

function isHeic(file: File): boolean {
  if (HEIC_MIME_TYPES.includes(file.type.toLowerCase())) return true
  // Some browsers report an empty MIME type for HEIC; fall back to the extension.
  return /\.hei[cf]$/i.test(file.name)
}

function withJpgName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '') + '.jpg'
}

// Converts HEIC -> JPEG (if needed) and downscales oversized images. Always
// returns a displayable file; on any failure it falls back to the original.
export async function prepareImageForUpload(file: File): Promise<File> {
  let working = file

  if (isHeic(file)) {
    try {
      const { heicTo } = await import('heic-to')
      const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: JPEG_QUALITY })
      working = new File([blob], withJpgName(file.name), { type: 'image/jpeg' })
    } catch {
      // Conversion failed — keep the original so the submission still goes through.
      return file
    }
  }

  const downscaled = await downscaleToJpeg(working)
  return downscaled ?? working
}

// Re-encodes the image to a capped-dimension JPEG via canvas. Returns null when
// no change is needed (already a web-displayable type within size limits) or if
// the browser can't decode it.
async function downscaleToJpeg(file: File): Promise<File | null> {
  if (!file.type.startsWith('image/')) return null

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  } catch {
    return null
  }

  const { width, height } = bitmap
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  const alreadyWebSafe = file.type === 'image/jpeg' || file.type === 'image/png'
  if (scale === 1 && alreadyWebSafe) {
    bitmap.close?.()
    return null
  }

  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close?.()
    return null
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close?.()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) return null
  return new File([blob], withJpgName(file.name), { type: 'image/jpeg' })
}
