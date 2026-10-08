import type { Sleep } from '@/db/schema'
import { minuteOfDay } from '@/lib/calculations/sleep'
import { formatTimeOfDay } from '@/lib/formatters'

/** "11:15 PM to 6:45 AM" */
export function formatSleepWindow(entry: Sleep): string {
  return `${formatTimeOfDay(minuteOfDay(entry.bedtime))} to ${formatTimeOfDay(minuteOfDay(entry.wakeTime))}`
}
