import type { WeightUnit } from '@/db/schema'
import type { WorkoutFormValues } from '@/features/workouts/workout-form-schema'

// An unsaved new workout survives closing the sheet or the app. Only one
// draft exists at a time; saving or discarding it clears it.

const DRAFT_KEY = 'grindos-workout-draft'

export interface WorkoutDraft {
  values: WorkoutFormValues
  unit: WeightUnit
  savedAt: number
}

export function loadDraft(): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as WorkoutDraft
    return Array.isArray(draft?.values?.entries) && typeof draft.values.name === 'string'
      ? draft
      : null
  } catch {
    return null
  }
}

export function saveDraft(values: WorkoutFormValues, unit: WeightUnit, now = Date.now()): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, unit, savedAt: now }))
  } catch {
    // Storage full or blocked: the draft is a convenience, so carry on without it.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Nothing to clear.
  }
}
