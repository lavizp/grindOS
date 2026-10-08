import { format } from 'date-fns'
import type { ID, Payment, Sleep, Workout } from '@/db/schema'
import type { DayKey } from '@/lib/dates'
import type { EntryType, HistoryFilters } from '@/stores/app-store'

// One list of everything logged, newest first, grouped by day.

interface ItemBase {
  id: ID
  date: DayKey
  /** `HH:mm` within the day, for ordering. Empty when unknown. */
  time: string
}

export type TimelineItem =
  | (ItemBase & { type: 'workout'; workout: Workout })
  | (ItemBase & { type: 'sleep'; sleep: Sleep })
  | (ItemBase & { type: 'payment'; payment: Payment })

export interface TimelineDay {
  date: DayKey
  items: TimelineItem[]
  /** Total of the day's payments that passed the filters. */
  spentMinor: number
}

export interface TimelineSource {
  workouts: Workout[]
  sleep: Sleep[]
  payments: Payment[]
}

/** When times tie (or are unknown), sleep comes last: it's the start of the day. */
const TYPE_ORDER: Record<EntryType, number> = { payment: 0, workout: 1, sleep: 2 }

export function buildTimeline(
  { workouts, sleep, payments }: TimelineSource,
  { types, categoryId }: Pick<HistoryFilters, 'types' | 'categoryId'>,
): TimelineDay[] {
  const items: TimelineItem[] = []
  if (types.includes('workout')) {
    for (const w of workouts) {
      items.push({ type: 'workout', id: w.id, date: w.date, time: w.startTime ?? '', workout: w })
    }
  }
  if (types.includes('sleep')) {
    for (const s of sleep) {
      items.push({ type: 'sleep', id: s.id, date: s.date, time: s.wakeTime.slice(11), sleep: s })
    }
  }
  if (types.includes('payment')) {
    for (const p of payments) {
      if (categoryId && p.categoryId !== categoryId) continue
      // Payments have no time of their own; when they were entered is close enough.
      const time = format(new Date(p.createdAt), 'HH:mm')
      items.push({ type: 'payment', id: p.id, date: p.date, time, payment: p })
    }
  }

  items.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.time.localeCompare(a.time) ||
      TYPE_ORDER[a.type] - TYPE_ORDER[b.type],
  )

  const days: TimelineDay[] = []
  for (const item of items) {
    let day = days.at(-1)
    if (!day || day.date !== item.date) {
      day = { date: item.date, items: [], spentMinor: 0 }
      days.push(day)
    }
    day.items.push(item)
    if (item.type === 'payment') day.spentMinor += item.payment.amountMinor
  }
  return days
}
