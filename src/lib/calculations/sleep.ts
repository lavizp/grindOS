import type { Sleep } from '@/db/schema'
import {
  isInRange,
  rangeDays,
  sleepDurationMin,
  type DayKey,
  type DayRange,
  type LocalDateTime,
} from '@/lib/dates'

// Times of day are compared on a "night clock": minutes since noon. Bedtimes
// either side of midnight (23:30, 00:30) stay next to each other instead of
// being 23 hours apart, so averages and spreads behave.

const DAY_MIN = 24 * 60
const NOON_MIN = 12 * 60

/** Minutes since midnight for the clock time in a local date-time. */
export function minuteOfDay(value: LocalDateTime): number {
  return Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16))
}

/** Minutes since noon: 12:00 → 0, 23:00 → 660, 01:00 → 780, 07:00 → 1140. */
export function toNightClock(value: LocalDateTime): number {
  return (minuteOfDay(value) - NOON_MIN + DAY_MIN) % DAY_MIN
}

/** Back from the night clock to minutes since midnight. */
export function fromNightClock(minutes: number): number {
  return (((Math.round(minutes) + NOON_MIN) % DAY_MIN) + DAY_MIN) % DAY_MIN
}

export function getDuration(entry: Sleep): number {
  return sleepDurationMin(entry.bedtime, entry.wakeTime)
}

function inRange(entries: Sleep[], range?: DayRange): Sleep[] {
  return range ? entries.filter((e) => isInRange(e.date, range)) : entries
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function stdDev(values: number[]): number {
  const m = mean(values)
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)))
}

/** Mean minutes slept per logged night, or null with no entries. */
export function getAverageSleep(entries: Sleep[], range?: DayRange): number | null {
  const rows = inRange(entries, range)
  return rows.length === 0 ? null : mean(rows.map(getDuration))
}

/** Mean quality of the nights that have one, or null. */
export function getAverageQuality(entries: Sleep[], range?: DayRange): number | null {
  const rated = inRange(entries, range).flatMap((e) => (e.quality ? [e.quality] : []))
  return rated.length === 0 ? null : mean(rated)
}

export interface SleepConsistency {
  /** Average bedtime and wake time, in minutes since midnight. */
  bedtime: number
  wakeTime: number
  /** Standard deviation of each, in minutes. Lower is more consistent. */
  bedtimeSpread: number
  wakeSpread: number
}

export function getSleepConsistency(entries: Sleep[], range?: DayRange): SleepConsistency | null {
  const rows = inRange(entries, range)
  if (rows.length === 0) return null
  const beds = rows.map((e) => toNightClock(e.bedtime))
  const wakes = rows.map((e) => toNightClock(e.wakeTime))
  return {
    bedtime: fromNightClock(mean(beds)),
    wakeTime: fromNightClock(mean(wakes)),
    bedtimeSpread: stdDev(beds),
    wakeSpread: stdDev(wakes),
  }
}

export interface SleepNight {
  date: DayKey
  /** null for nights with no entry. */
  durationMin: number | null
  /** Night-clock minutes (since noon), for charting. */
  bedtime: number | null
  wakeTime: number | null
  quality: number | null
  entry: Sleep | null
}

/** One point per day of the range, oldest first, with gaps for unlogged nights. */
export function getSleepTrend(entries: Sleep[], range: DayRange): SleepNight[] {
  const byDate = new Map(entries.map((e) => [e.date, e]))
  return rangeDays(range).map((date) => {
    const entry = byDate.get(date) ?? null
    return {
      date,
      durationMin: entry ? getDuration(entry) : null,
      bedtime: entry ? toNightClock(entry.bedtime) : null,
      wakeTime: entry ? toNightClock(entry.wakeTime) : null,
      quality: entry?.quality ?? null,
      entry,
    }
  })
}

/** Longest and shortest nights. Ties go to the better (or worse) quality, then the latest. */
export function getBestWorstNights(
  entries: Sleep[],
  range?: DayRange,
): { best: Sleep; worst: Sleep } | null {
  const rows = inRange(entries, range)
  if (rows.length === 0) return null
  const sorted = [...rows].sort(
    (a, b) =>
      getDuration(b) - getDuration(a) ||
      (b.quality ?? 0) - (a.quality ?? 0) ||
      b.date.localeCompare(a.date),
  )
  return { best: sorted[0], worst: sorted[sorted.length - 1] }
}

export interface SleepDebt {
  /** Net minutes short of target across logged nights. Negative means a surplus. */
  netMin: number
  nightsLogged: number
  nightsBelowTarget: number
}

export function getSleepDebt(entries: Sleep[], targetMin: number, range?: DayRange): SleepDebt {
  const durations = inRange(entries, range).map(getDuration)
  return {
    netMin: durations.reduce((sum, d) => sum + (targetMin - d), 0),
    nightsLogged: durations.length,
    nightsBelowTarget: durations.filter((d) => d < targetMin).length,
  }
}
