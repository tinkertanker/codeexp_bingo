// DSTA CODE_EXP / BrainHack 2026 problem statements. Teams are tagged with one of these
// (by id) on /admin/teams; the TV scoreboard can sort/group by them. Keep ids in sync with
// convex/problemStatements.ts (server-side validation list).
export type ProblemStatement = {
  id: string
  mission: string
  statement: string
}

export const PROBLEM_STATEMENTS: ProblemStatement[] = [
  {
    id: 'digital_shield',
    mission: 'Digital Shield',
    statement:
      'Design a web application that helps young Singaporeans actively fight online manipulation (e.g. misinformation, fraud, cyberbullying, etc.), and build a more informed and caring online community.',
  },
  {
    id: 'service_edge',
    mission: 'Service Edge',
    statement:
      'Design a web application that enhances the NS experience by making key moments more engaging and supportive (e.g. Anytime-Anywhere IPPT, real-time situational awareness in an ICT, streamlining field-pack verification in a Mobilisation, etc.)',
  },
  {
    id: 'quick_aid',
    mission: 'Quick Aid',
    statement:
      'Build a web application that gathers information from different sources to help Singapore respond faster and smarter during disasters or health emergencies.',
  },
]

export const PROBLEM_STATEMENT_IDS = PROBLEM_STATEMENTS.map((p) => p.id)

export function problemStatementMission(id: string | undefined | null): string {
  if (!id) return 'Unassigned'
  return PROBLEM_STATEMENTS.find((p) => p.id === id)?.mission ?? 'Unassigned'
}
