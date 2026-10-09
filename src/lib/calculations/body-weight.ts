import type { BodyWeight, WeightUnit } from '@/db/schema'
import { convertWeight } from '@/lib/calculations/workouts'
import { addDaysToKey, type DayKey } from '@/lib/dates'

export interface WeightPoint {
  date: DayKey
  /** In the display unit, to one decimal. */
  weight: number
  /** Mean of the entries in the 7 days ending on `date`, which smooths out daily swings. */
  average: number
}

export const AVERAGE_WINDOW_DAYS = 7

const round1 = (value: number) => Math.round(value * 10) / 10

/** Oldest first, in `unit`, each with its trailing 7-day average. */
export function getWeightPoints(entries: BodyWeight[], unit: WeightUnit): WeightPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const weights = sorted.map((e) => convertWeight(e.weight, e.unit, unit))
  return sorted.map((entry, index) => {
    const windowStart = addDaysToKey(entry.date, -(AVERAGE_WINDOW_DAYS - 1))
    let total = 0
    let count = 0
    for (let i = index; i >= 0 && sorted[i].date >= windowStart; i--) {
      total += weights[i]
      count += 1
    }
    return { date: entry.date, weight: round1(weights[index]), average: round1(total / count) }
  })
}

/** Points on or after `start` (all of them when `start` is undefined). */
export function pointsSince(points: WeightPoint[], start: DayKey | undefined): WeightPoint[] {
  return start === undefined ? points : points.filter((p) => p.date >= start)
}

export interface WeightChange {
  from: WeightPoint
  to: WeightPoint
  /** Positive when weight went up. Compares 7-day averages, so one heavy day doesn't skew it. */
  change: number
}

/** From the first to the last of `points`. Null with fewer than two. */
export function getWeightChange(points: WeightPoint[]): WeightChange | null {
  if (points.length < 2) return null
  const from = points[0]
  const to = points[points.length - 1]
  return { from, to, change: round1(to.average - from.average) }
}
