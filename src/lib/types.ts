import type { Doc, Id } from '../../convex/_generated/dataModel'

export type TeamColour = 'red' | 'blue' | 'green' | 'yellow' | 'purple'
export type TeamCategory = 'cat1' | 'cat2'
export type SquareCategory = 'orange' | 'blue' | 'grey' | 'wild'
export type VerificationKind =
  | 'scan_team'
  | 'scan_team_with_answer'
  | 'photo_with_team'
  | 'photo_auto'
  | 'photo_mentor'
  | 'ig_url_mentor'
  | 'booth_qr'
export type CompletionStatus = 'pending' | 'approved' | 'rejected'

export type Team = Doc<'teams'>
export type BingoSquare = Doc<'bingoSquares'>
export type SquareCompletion = Doc<'squareCompletions'>
export type Photo = Doc<'photos'>
export type CodeSubmission = Doc<'codeSubmissions'>
export type GameState = Doc<'gameState'>
export type TeamEligibility = Doc<'teamEligibility'>
export type FanVote = Doc<'fanVotes'>

export type DrawWinner = { teamId: Id<'teams'>; prizeRank: number }

export type TeamId = Id<'teams'>
export type BingoSquareId = Id<'bingoSquares'>
export type SquareCompletionId = Id<'squareCompletions'>
export type StorageId = Id<'_storage'>
