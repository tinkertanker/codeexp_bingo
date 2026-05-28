import type { TeamCategory } from './types'

// cat1 = Beginner, cat2 = Open. Stored as cat1/cat2 in Convex; shown with these labels in the UI.
export const CATEGORIES: TeamCategory[] = ['cat1', 'cat2']

export const CATEGORY_LABELS: Record<TeamCategory, string> = {
  cat1: 'Beginner',
  cat2: 'Open',
}

export function categoryLabel(category: TeamCategory | undefined): string {
  return CATEGORY_LABELS[category ?? 'cat1']
}
