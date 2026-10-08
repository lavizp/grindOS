import type { Sleep, Workout } from '@/db/schema'
import { getDuration } from '@/lib/calculations/sleep'
import { addDaysToKey, daysBetween } from '@/lib/dates'
import { formatDuration } from '@/lib/formatters'
import { mean } from '@/lib/calculations/insights/helpers'
import type { Insight, InsightRule } from '@/lib/calculations/insights/types'

// Sleep against training. The night "after" a day is the sleep entry dated the
// next morning. These claims are easy to over-read, so each side needs at
// least MIN_NIGHTS nights and the difference has to be clear.

export const MIN_NIGHTS = 5
/** Differences smaller than this aren't reported. */
export const SLEEP_DIFF_MIN = 15
const WINDOW_DAYS = 90
/** A workout starting at or after this is "late". */
export const LATE_WORKOUT_TIME = '20:00'

interface Night {
  minutes: number
  /** Workouts on the day before this night. */
  workouts: Workout[]
}

function nightsWithWorkouts(sleep: Sleep[], workouts: Workout[], today: string): Night[] {
  const byDay = new Map<string, Workout[]>()
  for (const w of workouts) byDay.set(w.date, [...(byDay.get(w.date) ?? []), w])
  return sleep
    .filter((s) => s.date <= today && daysBetween(s.date, today) < WINDOW_DAYS)
    .map((s) => ({ minutes: getDuration(s), workouts: byDay.get(addDaysToKey(s.date, -1)) ?? [] }))
}

function compare(
  a: Night[],
  b: Night[],
): { averageA: number; averageB: number; diff: number } | null {
  if (a.length < MIN_NIGHTS || b.length < MIN_NIGHTS) return null
  const averageA = mean(a.map((n) => n.minutes))
  const averageB = mean(b.map((n) => n.minutes))
  const diff = averageA - averageB
  return Math.abs(diff) < SLEEP_DIFF_MIN ? null : { averageA, averageB, diff }
}

/** Nights after training days against nights after rest days. */
export const sleepAfterWorkouts: InsightRule = ({ data, today }) => {
  // Only count training once someone has started logging it.
  if (data.workouts.length === 0) return []
  const nights = nightsWithWorkouts(data.sleep, data.workouts, today)
  const trained = nights.filter((n) => n.workouts.length > 0)
  const rested = nights.filter((n) => n.workouts.length === 0)
  const result = compare(trained, rested)
  if (!result) return []
  const longer = result.diff > 0
  return [
    {
      id: `cross-sleep-after-workouts-${longer ? 'longer' : 'shorter'}`,
      domain: 'cross',
      severity: longer ? 'positive' : 'neutral',
      priority: 45,
      title: `You sleep ${formatDuration(Math.abs(result.diff))} ${longer ? 'longer' : 'less'} after workout days`,
      detail: `${formatDuration(result.averageA)} after training (${trained.length} nights), ${formatDuration(result.averageB)} after rest days (${rested.length} nights).`,
      link: '/sleep',
    },
  ]
}

/** Nights after late workouts against nights after earlier ones. */
export const lateWorkouts: InsightRule = ({ data, today }) => {
  const nights = nightsWithWorkouts(data.sleep, data.workouts, today).filter(
    // Every workout that day needs a start time to say whether it was late.
    (n) => n.workouts.length > 0 && n.workouts.every((w) => w.startTime),
  )
  const isLate = (n: Night) => n.workouts.some((w) => w.startTime! >= LATE_WORKOUT_TIME)
  const late = nights.filter(isLate)
  const earlier = nights.filter((n) => !isLate(n))
  const result = compare(late, earlier)
  if (!result) return []
  const less = result.diff < 0
  const insight: Insight = {
    id: `cross-late-workouts-${less ? 'less' : 'more'}`,
    domain: 'cross',
    severity: less ? 'warning' : 'neutral',
    priority: less ? 50 : 30,
    title: `You sleep ${formatDuration(Math.abs(result.diff))} ${less ? 'less' : 'more'} after late workouts`,
    detail: `${formatDuration(result.averageA)} after workouts from 8 PM (${late.length} nights), ${formatDuration(result.averageB)} after earlier ones (${earlier.length} nights).`,
    link: '/sleep',
  }
  return [insight]
}

export const crossRules: InsightRule[] = [sleepAfterWorkouts, lateWorkouts]
