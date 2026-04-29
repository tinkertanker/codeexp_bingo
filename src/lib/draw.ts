import type { Standing } from './standings'

export function pickWinners(standings: Standing[], count: number): string[] {
  const eligible = standings.filter((s) => s.entries > 0)
  if (eligible.length === 0) return []
  const pool: string[] = []
  for (const s of eligible) {
    for (let i = 0; i < s.entries; i++) pool.push(s.team.id)
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const winners: string[] = []
  for (const id of pool) {
    if (!winners.includes(id)) winners.push(id)
    if (winners.length === count) break
  }
  return winners
}
