import { addMonths, format } from 'date-fns'
import {
  addDaysToKey,
  isInRange,
  monthRange,
  parseDayKey,
  todayKey,
  toDayKey,
  weekRange,
  type DayKey,
  type DayRange,
  type WeekStart,
} from '@/lib/dates'
import type { Span } from '@/stores/app-store'

export function periodRange(period: Span, anchor: DayKey, weekStartsOn: WeekStart): DayRange {
  if (period === 'day') return { start: anchor, end: anchor }
  return period === 'week' ? weekRange(anchor, weekStartsOn) : monthRange(anchor)
}

/** Moves the anchor one period forward (1) or back (-1). */
export function shiftAnchor(period: Span, anchor: DayKey, direction: 1 | -1): DayKey {
  if (period === 'day') return addDaysToKey(anchor, direction)
  if (period === 'week') return addDaysToKey(anchor, 7 * direction)
  return toDayKey(addMonths(parseDayKey(anchor), direction))
}

/** Whether the range is the current period (so "next" would be the future). */
export function isCurrentPeriod(range: DayRange, today: DayKey = todayKey()): boolean {
  return isInRange(today, range)
}

/**
 * "Today", "Yesterday", "Mon, Oct 5", "This week", "Last week",
 * "Sep 28 – Oct 4", "This month", "September", "December 2025".
 */
export function formatPeriodLabel(
  period: Span,
  range: DayRange,
  today: DayKey = todayKey(),
  weekStartsOn: WeekStart = 0,
): string {
  if (period === 'day') {
    if (range.start === today) return 'Today'
    if (range.start === addDaysToKey(today, -1)) return 'Yesterday'
    const sameYear = range.start.slice(0, 4) === today.slice(0, 4)
    return format(parseDayKey(range.start), sameYear ? 'EEE, MMM d' : 'MMM d, yyyy')
  }
  if (period === 'week') {
    const current = weekRange(today, weekStartsOn)
    if (range.start === current.start) return 'This week'
    if (range.start === addDaysToKey(current.start, -7)) return 'Last week'
    const start = parseDayKey(range.start)
    const end = parseDayKey(range.end)
    const sameYear = range.start.slice(0, 4) === today.slice(0, 4)
    const sameMonth = range.start.slice(0, 7) === range.end.slice(0, 7)
    const endLabel = format(end, sameMonth ? 'd' : 'MMM d')
    return `${format(start, 'MMM d')} – ${endLabel}${sameYear ? '' : format(end, ', yyyy')}`
  }
  if (range.start.slice(0, 7) === today.slice(0, 7)) return 'This month'
  const start = parseDayKey(range.start)
  return format(start, range.start.slice(0, 4) === today.slice(0, 4) ? 'MMMM' : 'MMMM yyyy')
}
