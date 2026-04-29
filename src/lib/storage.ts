import { supabase } from './supabase'

const PHOTO_BUCKET = 'photos'

export type UploadResult = { ok: true; path: string } | { ok: false; reason: string }

export async function uploadPhoto(teamId: string, squareId: string, file: File): Promise<UploadResult> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5)
  const path = `${teamId}/${squareId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })
  if (error) return { ok: false, reason: error.message }
  return { ok: true, path }
}

export function publicPhotoUrl(path: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}
