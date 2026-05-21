const LINES: number[][] = (() => {
  const out: number[][] = []
  for (let r = 0; r < 4; r++) out.push([0, 1, 2, 3].map((c) => r * 4 + c))
  for (let c = 0; c < 4; c++) out.push([0, 1, 2, 3].map((r) => r * 4 + c))
  out.push([0, 5, 10, 15])
  out.push([3, 6, 9, 12])
  return out
})()

// (5) `effectivelyFilledPositions` = completed by this team OR locked for the other category.
// Cat2 teams get the locked AI square auto-filled so they still have a fair shot at the draw.
export function countCompletedLines(effectivelyFilledPositions: Set<number>): number {
  let n = 0
  for (const line of LINES) {
    if (line.every((p) => effectivelyFilledPositions.has(p))) n++
  }
  return n
}

export function bingoLines(): readonly (readonly number[])[] {
  return LINES
}
