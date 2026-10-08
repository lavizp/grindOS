import { addMonths, format } from 'date-fns'
import type { ID, Payment } from '@/db/schema'
import {
  addDaysToKey,
  isInRange,
  monthRange,
  parseDayKey,
  rangeDays,
  rangeLength,
  type DayKey,
  type DayRange,
} from '@/lib/dates'

// Pure aggregations over payments. Amounts are integer minor units throughout.

/** 'yyyy-MM' */
export type MonthKey = string

export interface CategoryTotal {
  categoryId: ID
  totalMinor: number
  count: number
  /** Share of the overall total, 0–1. */
  share: number
}

export interface DayTotal {
  date: DayKey
  totalMinor: number
}

export interface MonthTotal {
  month: MonthKey
  totalMinor: number
}

export interface PeriodComparison {
  currentMinor: number
  previousMinor: number
  /** Fractional change (0.12 = 12% more); null when there's nothing to compare against. */
  change: number | null
  /** Days of the previous period counted. When the current period is over,
   * both periods are compared in full even if their lengths differ. */
  days: number
}

function inRange(payments: Payment[], range?: DayRange): Payment[] {
  return range ? payments.filter((p) => isInRange(p.date, range)) : payments
}

function sum(payments: Payment[]): number {
  return payments.reduce((total, p) => total + p.amountMinor, 0)
}

export function getTotalSpending(payments: Payment[], range?: DayRange): number {
  return sum(inRange(payments, range))
}

/** Totals per category, largest first. Categories with no spending are omitted. */
export function getSpendingByCategory(payments: Payment[], range?: DayRange): CategoryTotal[] {
  const rows = inRange(payments, range)
  const total = sum(rows)
  const byId = new Map<ID, { totalMinor: number; count: number }>()
  for (const p of rows) {
    const entry = byId.get(p.categoryId) ?? { totalMinor: 0, count: 0 }
    entry.totalMinor += p.amountMinor
    entry.count += 1
    byId.set(p.categoryId, entry)
  }
  return [...byId]
    .map(([categoryId, e]) => ({ categoryId, ...e, share: total ? e.totalMinor / total : 0 }))
    .sort((a, b) => b.totalMinor - a.totalMinor || a.categoryId.localeCompare(b.categoryId))
}

export function getTopCategories(
  payments: Payment[],
  limit = 3,
  range?: DayRange,
): CategoryTotal[] {
  return getSpendingByCategory(payments, range).slice(0, limit)
}

/** One entry per day in the range, including days with no spending. */
export function getDailySpending(payments: Payment[], range: DayRange): DayTotal[] {
  const totals = new Map<DayKey, number>()
  for (const p of inRange(payments, range)) {
    totals.set(p.date, (totals.get(p.date) ?? 0) + p.amountMinor)
  }
  return rangeDays(range).map((date) => ({ date, totalMinor: totals.get(date) ?? 0 }))
}

/** The `count` months ending with the month containing `endDay`, oldest first. */
export function getMonthlySpending(payments: Payment[], endDay: DayKey, count = 6): MonthTotal[] {
  const end = parseDayKey(endDay)
  const months = Array.from({ length: count }, (_, i) =>
    format(addMonths(end, i - count + 1), 'yyyy-MM'),
  )
  const totals = new Map<MonthKey, number>(months.map((m) => [m, 0]))
  for (const p of payments) {
    const month = p.date.slice(0, 7)
    if (totals.has(month)) totals.set(month, totals.get(month)! + p.amountMinor)
  }
  return months.map((month) => ({ month, totalMinor: totals.get(month)! }))
}

/** Largest single payments, biggest first; ties go to the most recent. */
export function getLargestExpenses(payments: Payment[], limit = 5, range?: DayRange): Payment[] {
  return [...inRange(payments, range)]
    .sort(
      (a, b) =>
        b.amountMinor - a.amountMinor || b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
    )
    .slice(0, limit)
}

/** The part of `range` that has happened by `today` (null if it's all in the future). */
export function elapsedRange(range: DayRange, today: DayKey): DayRange | null {
  if (today < range.start) return null
  return { start: range.start, end: today < range.end ? today : range.end }
}

/** Average per elapsed day of the range, so a half-finished month isn't understated. */
export function getAverageDaily(payments: Payment[], range: DayRange, today: DayKey): number {
  const elapsed = elapsedRange(range, today)
  if (!elapsed) return 0
  return Math.round(getTotalSpending(payments, elapsed) / rangeLength(elapsed))
}

function comparison(current: number, previous: number, days: number): PeriodComparison {
  return {
    currentMinor: current,
    previousMinor: previous,
    change: previous > 0 ? (current - previous) / previous : null,
    days,
  }
}

/**
 * This period so far against the same number of days at the start of the
 * previous period, so the 8th of a month is compared with the 8th of the last.
 * `previous` is the full previous period (previous week or calendar month).
 */
export function comparePeriods(
  payments: Payment[],
  range: DayRange,
  previous: DayRange,
  today: DayKey,
): PeriodComparison | null {
  const elapsed = elapsedRange(range, today)
  if (!elapsed) return null
  const days = Math.min(rangeLength(elapsed), rangeLength(previous))
  const previousSoFar = { start: previous.start, end: addDaysToKey(previous.start, days - 1) }
  return comparison(
    getTotalSpending(payments, elapsed),
    getTotalSpending(payments, previousSoFar),
    days,
  )
}

/** The month containing `day` against the previous calendar month, like for like. */
export function compareMonths(
  payments: Payment[],
  day: DayKey,
  today: DayKey,
): PeriodComparison | null {
  const range = monthRange(day)
  const previous = monthRange(addDaysToKey(range.start, -1))
  return comparePeriods(payments, range, previous, today)
}

/** Payments grouped by day, newest day first; within a day, newest first. */
export function groupByDay(
  payments: Payment[],
): Array<{ date: DayKey; payments: Payment[]; totalMinor: number }> {
  const groups = new Map<DayKey, Payment[]>()
  const sorted = [...payments].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  )
  for (const p of sorted) {
    const group = groups.get(p.date)
    if (group) group.push(p)
    else groups.set(p.date, [p])
  }
  return [...groups].map(([date, rows]) => ({ date, payments: rows, totalMinor: sum(rows) }))
}
