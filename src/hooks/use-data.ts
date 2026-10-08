import { useLiveQuery } from 'dexie-react-hooks'
import { repositories } from '@/db'
import { DEFAULT_SETTINGS, type ID } from '@/db/schema'
import type { DayRange } from '@/lib/dates'

// Live queries re-run automatically whenever the underlying tables change.
// Each hook returns `undefined` while the first query is loading.

export function useWorkouts(range: DayRange) {
  return useLiveQuery(() => repositories.workouts.listByRange(range), [range.start, range.end])
}

export function useWorkout(id: ID | undefined) {
  return useLiveQuery(async () => (id ? repositories.workouts.getById(id) : undefined), [id])
}

export function useSleepEntries(range: DayRange) {
  return useLiveQuery(() => repositories.sleep.listByRange(range), [range.start, range.end])
}

export function useSleepEntry(id: ID | undefined) {
  return useLiveQuery(async () => (id ? repositories.sleep.getById(id) : undefined), [id])
}

export function usePayments(range: DayRange) {
  return useLiveQuery(() => repositories.payments.listByRange(range), [range.start, range.end])
}

export function usePayment(id: ID | undefined) {
  return useLiveQuery(async () => (id ? repositories.payments.getById(id) : undefined), [id])
}

export function useCategories({ includeArchived = false } = {}) {
  return useLiveQuery(() => repositories.categories.list({ includeArchived }), [includeArchived])
}

export function useExercises({ includeArchived = false } = {}) {
  return useLiveQuery(() => repositories.exercises.list({ includeArchived }), [includeArchived])
}

export function useSettings() {
  return useLiveQuery(() => repositories.settings.get(), [])
}

export function useRecentMerchants(limit = 20) {
  return useLiveQuery(() => repositories.payments.recentMerchants(limit), [limit])
}

/** The display currency. Falls back to the default while settings load. */
export function useCurrency(): string {
  return useSettings()?.currency ?? DEFAULT_SETTINGS.currency
}
