import type { WeightUnit } from '@/db/schema'
import { getWeightChange, type WeightPoint } from '@/lib/calculations/body-weight'
import { formatRelativeDay, formatWeight } from '@/lib/formatters'
import type { DayKey } from '@/lib/dates'

/** "Down 1.2 kg in 30 days", or null when there's nothing to compare. */
export function describeChange(points: WeightPoint[], unit: WeightUnit, phrase: string) {
  const change = getWeightChange(points)
  if (!change) return null
  if (change.change === 0) return `No change ${phrase}`
  const amount = formatWeight(Math.abs(change.change), unit)
  return `${change.change < 0 ? 'Down' : 'Up'} ${amount} ${phrase}`
}

/** "today", "yesterday", "on Monday", "on Mar 4": reads after "Logged". */
export function loggedWhen(date: DayKey, today: DayKey): string {
  const day = formatRelativeDay(date, today)
  return day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : `on ${day}`
}
