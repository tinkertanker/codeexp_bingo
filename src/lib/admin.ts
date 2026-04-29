import { supabase } from './supabase'
import { loadAdminCreds } from './token'

export type AdminCreds = { name: string; passcode: string }

const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || ''
const ORGANISER_NAMES: string[] = (import.meta.env.VITE_ORGANISER_NAMES || '')
  .split(',')
  .map((s: string) => s.trim())
  .filter((s: string) => s.length > 0)
  .map((s: string) => s.toLowerCase())

export function checkPasscode(input: string): boolean {
  if (!ADMIN_PASSCODE) return false
  return input.trim() === ADMIN_PASSCODE
}

export function requireAdmin(): AdminCreds | null {
  const creds = loadAdminCreds()
  if (!creds) return null
  if (!checkPasscode(creds.passcode)) return null
  return creds
}

export function isOrganiser(name: string): boolean {
  return ORGANISER_NAMES.includes(name.trim().toLowerCase())
}

type MentorAction = 'approve' | 'reject' | 'draw' | 'open_game' | 'close_game' | 'regen_token' | 'create_team'

export async function logMentorAction(
  mentorName: string,
  action: MentorAction,
  completionId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabase.from('mentor_actions').insert({
    mentor_name: mentorName,
    action,
    completion_id: completionId,
    metadata: metadata ?? null,
  })
}

export async function approveCompletion(completionId: string, mentorName: string): Promise<{ ok: boolean; reason?: string }> {
  const { error } = await supabase
    .from('square_completions')
    .update({
      status: 'approved',
      approved_by_mentor: mentorName,
      approved_at: new Date().toISOString(),
      rejected_reason: null,
    })
    .eq('id', completionId)
  if (error) return { ok: false, reason: error.message }
  await logMentorAction(mentorName, 'approve', completionId)
  return { ok: true }
}

export async function rejectCompletion(
  completionId: string,
  mentorName: string,
  reason: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { error } = await supabase
    .from('square_completions')
    .update({
      status: 'rejected',
      approved_by_mentor: mentorName,
      approved_at: new Date().toISOString(),
      rejected_reason: reason,
    })
    .eq('id', completionId)
  if (error) return { ok: false, reason: error.message }
  await logMentorAction(mentorName, 'reject', completionId, { reason })
  return { ok: true }
}

export function generateTeamToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20)
}
