import type { Exercise } from '@/db/schema'
import { exerciseNameKey } from '@/db/seed'

/** Matches whose name starts with the query come before ones that merely contain it. */
export function searchExercises(exercises: Exercise[], query: string, usedIds = new Set<string>()) {
  const q = exerciseNameKey(query)
  return exercises
    .filter((e) => q === '' || e.nameKey.includes(q))
    .sort(
      (a, b) =>
        Number(usedIds.has(a.id)) - Number(usedIds.has(b.id)) ||
        Number(!a.nameKey.startsWith(q)) - Number(!b.nameKey.startsWith(q)) ||
        a.name.localeCompare(b.name),
    )
}
