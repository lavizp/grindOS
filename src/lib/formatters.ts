import { format } from 'date-fns'
import { addDaysToKey, daysBetween, parseDayKey, todayKey, type DayKey } from '@/lib/dates'

/** 408 → "6h 48m", 45 → "45m", 480 → "8h". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/** 62.5, 'kg' → "62.5 kg". */
export function formatWeight(value: number, unit: 'kg' | 'lb', locale?: string): string {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
  return `${number} ${unit}`
}

/** "Today", "Yesterday", "Monday" (within a week), "Mar 4", or "Mar 4, 2025". */
export function formatRelativeDay(day: DayKey, today: DayKey = todayKey()): string {
  const diff = daysBetween(day, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === -1) return 'Tomorrow'
  const date = parseDayKey(day)
  if (diff > 1 && diff < 7) return format(date, 'EEEE')
  return day.slice(0, 4) === today.slice(0, 4) ? format(date, 'MMM d') : format(date, 'MMM d, yyyy')
}

/** Minutes since midnight → "11:30 PM" (or "23:30", per locale). */
export function formatTimeOfDay(minutes: number, locale?: string): string {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60) % 24, minutes % 60)
  const twelveHour = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12
  // 24-hour clocks read as "07:05"; 12-hour clocks as "7:05 AM".
  return new Intl.DateTimeFormat(locale, {
    hour: twelveHour ? 'numeric' : '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * A sleep entry's night, named by the evening it started. `wakeDay` is the
 * morning woken up: "Last night", "Monday night", "Night of Sep 28".
 */
export function formatNight(wakeDay: DayKey, today: DayKey = todayKey()): string {
  const diff = daysBetween(wakeDay, today)
  if (diff === 0) return 'Last night'
  const evening = parseDayKey(addDaysToKey(wakeDay, -1))
  if (diff > 0 && diff < 7) return `${format(evening, 'EEEE')} night`
  return wakeDay.slice(0, 4) === today.slice(0, 4)
    ? `Night of ${format(evening, 'MMM d')}`
    : `Night of ${format(evening, 'MMM d, yyyy')}`
}
