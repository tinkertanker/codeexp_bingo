import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type TeamColour = 'red' | 'blue' | 'green' | 'yellow'

export type Team = {
  id: string
  name: string
  colour: TeamColour
  token: string
  created_at: string
}

export type SquareCategory = 'orange' | 'blue' | 'grey' | 'wild'

export type VerificationKind =
  | 'scan_team'
  | 'scan_team_with_answer'
  | 'photo_with_team'
  | 'photo_auto'
  | 'photo_mentor'
  | 'ig_url_mentor'
  | 'booth_qr'

export type BingoSquare = {
  id: string
  position: number
  category: SquareCategory
  title: string
  description: string
  verification_kind: VerificationKind
  enforce_colour_distinct: boolean
}

export type CompletionStatus = 'pending' | 'approved' | 'rejected'

export type SquareCompletion = {
  id: string
  team_id: string
  square_id: string
  status: CompletionStatus
  scanned_team_id: string | null
  text_answer: string | null
  photo_path: string | null
  ig_url: string | null
  approved_by_mentor: string | null
  approved_at: string | null
  rejected_reason: string | null
  created_at: string
}

export type CodeSubmission = {
  team_id: string
  github_url: string
  github_is_public: boolean | null
  github_check_response: unknown
  zip_storage_path: string | null
  zip_clean: boolean | null
  zip_check_response: unknown
  updated_at: string
}

export type DrawWinner = { team_id: string; prize_rank: number }

export type GameState = {
  id: 1
  is_open: boolean
  draw_winners: DrawWinner[] | null
  draw_at: string | null
}

export type Photo = {
  id: string
  team_id: string
  completion_id: string
  storage_path: string
  caption: string | null
  created_at: string
}
