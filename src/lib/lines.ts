const LINES: number[][] = (() => {
  const out: number[][] = []
  for (let r = 0; r < 4; r++) out.push([0, 1, 2, 3].map((c) => r * 4 + c))
  for (let c = 0; c < 4; c++) out.push([0, 1, 2, 3].map((r) => r * 4 + c))
  out.push([0, 5, 10, 15])
  out.push([3, 6, 9, 12])
  return out
})()

export function countCompletedLines(completedPositions: Set<number>): number {
  let n = 0
  for (const line of LINES) {
    if (line.every((p) => completedPositions.has(p))) n++
  }
  return n
}

export function bingoLines(): readonly (readonly number[])[] {
  return LINES
}
