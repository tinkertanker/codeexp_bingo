import { supabase, type BingoSquare, type Team, type TeamColour } from './supabase'
import { uploadPhoto } from './storage'

export type SubmitResult = { ok: true; pending: boolean } | { ok: false; reason: string }

type CompletionPayload = {
  team_id: string
  square_id: string
  status: 'approved' | 'pending'
  scanned_team_id?: string | null
  text_answer?: string | null
  photo_path?: string | null
  ig_url?: string | null
}

async function upsertCompletion(payload: CompletionPayload): Promise<
  | { ok: true; completionId: string; pending: boolean }
  | { ok: false; reason: string }
> {
  const { data, error } = await supabase
    .from('square_completions')
    .upsert(payload, { onConflict: 'team_id,square_id' })
    .select('id')
    .single()
  if (error) return { ok: false, reason: error.message }
  return { ok: true, completionId: data.id as string, pending: payload.status === 'pending' }
}

async function registerPhoto(completionId: string, teamId: string, path: string): Promise<void> {
  await supabase.from('photos').insert({
    team_id: teamId,
    completion_id: completionId,
    storage_path: path,
  })
}

async function checkBlueColourRule(
  myTeamId: string,
  mySquareId: string,
  scannedColour: TeamColour,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: blueSquares } = await supabase
    .from('bingo_squares')
    .select('id')
    .eq('enforce_colour_distinct', true)
  if (!blueSquares) return { ok: true }
  const otherSquareIds = blueSquares.map((s) => s.id as string).filter((id) => id !== mySquareId)
  if (otherSquareIds.length === 0) return { ok: true }

  const { data: completions } = await supabase
    .from('square_completions')
    .select('scanned_team_id')
    .eq('team_id', myTeamId)
    .in('square_id', otherSquareIds)
    .not('scanned_team_id', 'is', null)
    .in('status', ['approved', 'pending'])
  if (!completions || completions.length === 0) return { ok: true }

  const scannedIds = completions
    .map((c) => c.scanned_team_id as string | null)
    .filter((x): x is string => !!x)
  if (scannedIds.length === 0) return { ok: true }

  const { data: scannedTeams } = await supabase
    .from('teams')
    .select('colour')
    .in('id', scannedIds)
  if (!scannedTeams) return { ok: true }

  if (scannedTeams.some((t) => (t.colour as TeamColour) === scannedColour)) {
    return {
      ok: false,
      reason: `You've already used a ${scannedColour} team for another blue square. Each blue square needs a different team-colour.`,
    }
  }
  return { ok: true }
}

export async function submitScanTeam(team: Team, square: BingoSquare, scannedTeam: Team): Promise<SubmitResult> {
  const r = await upsertCompletion({
    team_id: team.id,
    square_id: square.id,
    scanned_team_id: scannedTeam.id,
    status: 'approved',
  })
  return r.ok ? { ok: true, pending: false } : r
}

export async function submitScanTeamWithAnswer(
  team: Team,
  square: BingoSquare,
  scannedTeam: Team,
  answer: string,
): Promise<SubmitResult> {
  if (square.enforce_colour_distinct) {
    const colourCheck = await checkBlueColourRule(team.id, square.id, scannedTeam.colour)
    if (!colourCheck.ok) return colourCheck
  }
  const r = await upsertCompletion({
    team_id: team.id,
    square_id: square.id,
    scanned_team_id: scannedTeam.id,
    text_answer: answer.trim(),
    status: 'approved',
  })
  return r.ok ? { ok: true, pending: false } : r
}

export async function submitPhotoWithTeam(
  team: Team,
  square: BingoSquare,
  scannedTeam: Team,
  file: File,
): Promise<SubmitResult> {
  const upload = await uploadPhoto(team.id, square.id, file)
  if (!upload.ok) return upload
  const r = await upsertCompletion({
    team_id: team.id,
    square_id: square.id,
    scanned_team_id: scannedTeam.id,
    photo_path: upload.path,
    status: 'approved',
  })
  if (!r.ok) return r
  await registerPhoto(r.completionId, team.id, upload.path)
  return { ok: true, pending: false }
}

export async function submitPhotoAuto(team: Team, square: BingoSquare, file: File): Promise<SubmitResult> {
  const upload = await uploadPhoto(team.id, square.id, file)
  if (!upload.ok) return upload
  const r = await upsertCompletion({
    team_id: team.id,
    square_id: square.id,
    photo_path: upload.path,
    status: 'approved',
  })
  if (!r.ok) return r
  await registerPhoto(r.completionId, team.id, upload.path)
  return { ok: true, pending: false }
}

export async function submitPhotoMentor(team: Team, square: BingoSquare, file: File): Promise<SubmitResult> {
  const upload = await uploadPhoto(team.id, square.id, file)
  if (!upload.ok) return upload
  const r = await upsertCompletion({
    team_id: team.id,
    square_id: square.id,
    photo_path: upload.path,
    status: 'pending',
  })
  if (!r.ok) return r
  await registerPhoto(r.completionId, team.id, upload.path)
  return { ok: true, pending: true }
}

export async function submitIgUrl(team: Team, square: BingoSquare, url: string): Promise<SubmitResult> {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) return { ok: false, reason: 'Please paste a full URL starting with https://' }
  const r = await upsertCompletion({
    team_id: team.id,
    square_id: square.id,
    ig_url: trimmed,
    status: 'pending',
  })
  return r.ok ? { ok: true, pending: true } : r
}

export async function submitBoothQr(team: Team, square: BingoSquare): Promise<SubmitResult> {
  const r = await upsertCompletion({
    team_id: team.id,
    square_id: square.id,
    status: 'approved',
  })
  return r.ok ? { ok: true, pending: false } : r
}
