// Server-side allow-list of valid problem-statement ids. Keep in sync with
// src/lib/problemStatements.ts. Used by teams.setProblemStatement to reject bad values.
export const PROBLEM_STATEMENT_IDS = ['digital_shield', 'service_edge', 'quick_aid'] as const

export function isValidProblemStatement(id: string): boolean {
  return (PROBLEM_STATEMENT_IDS as readonly string[]).includes(id)
}
