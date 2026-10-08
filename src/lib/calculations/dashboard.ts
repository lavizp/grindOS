import type { Payment, Workout } from '@/db/schema'
import { getAverageDaily } from '@/lib/calculations/spending'
import { getWeeklyCounts } from '@/lib/calculations/workouts'
import { addDaysToKey, daysBetween, toDayKey, type DayKey, type WeekStart } from '@/lib/dates'

// Baselines the Dashboard compares today and this week against.

/** Weeks of history that make up "your usual". */
export const USUAL_WEEKS = 4
/** Days of history behind the typical daily spend. */
export const TYPICAL_SPENDING_DAYS = 30
export const BACKUP_INTERVAL_DAYS = 14

/**
 * Average workouts per week over the full weeks before this one, rounded.
 * Null without any workouts in that time: there's no habit to compare with.
 */
export function getUsualWeeklyWorkouts(
  workouts: Workout[],
  today: DayKey,
  weekStartsOn: WeekStart,
  weeks = USUAL_WEEKS,
): number | null {
  const previous = getWeeklyCounts(workouts, today, weekStartsOn, weeks + 1).slice(0, -1)
  const total = previous.reduce((sum, w) => sum + w.count, 0)
  return total === 0 ? null : Math.round(total / weeks)
}

/**
 * Average spent per day over the `days` days before today (today excluded,
 * since it isn't over). Null when there's no spending in that window.
 */
export function getTypicalDailySpending(
  payments: Payment[],
  today: DayKey,
  days = TYPICAL_SPENDING_DAYS,
): number | null {
  const yesterday = addDaysToKey(today, -1)
  const range = { start: addDaysToKey(today, -days), end: yesterday }
  const average = getAverageDaily(payments, range, yesterday)
  return average === 0 ? null : average
}

/**
 * Whether to suggest a backup: the last one (or, if there's never been one,
 * the first entry) is more than `intervalDays` old.
 */
export function needsBackup(
  lastBackupAt: number | undefined,
  firstLoggedDay: DayKey | null,
  now: Date,
  intervalDays = BACKUP_INTERVAL_DAYS,
): boolean {
  if (firstLoggedDay === null) return false
  const since = lastBackupAt === undefined ? firstLoggedDay : toDayKey(new Date(lastBackupAt))
  return daysBetween(since, toDayKey(now)) > intervalDays
}

/** Whole days since the last backup, or null if there's never been one. */
export function daysSinceBackup(lastBackupAt: number | undefined, now: Date): number | null {
  return lastBackupAt === undefined
    ? null
    : daysBetween(toDayKey(new Date(lastBackupAt)), toDayKey(now))
}
