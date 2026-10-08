import type { Payment, Sleep, Workout } from '@/db/schema'
import { buildTimeline, type TimelineSource } from '@/features/history/timeline'
import { ALL_ENTRY_TYPES } from '@/stores/app-store'

const at = (day: string, time: string) => new Date(`${day}T${time}:00`).getTime()

const workout: Workout = {
  id: 'w1',
  date: '2026-10-07',
  name: 'Push',
  startTime: '18:30',
  unit: 'kg',
  entries: [],
  exerciseIds: [],
  createdAt: at('2026-10-07', '19:30'),
  updatedAt: 0,
}

const sleep: Sleep = {
  id: 's1',
  date: '2026-10-07',
  bedtime: '2026-10-06T23:00',
  wakeTime: '2026-10-07T07:00',
  createdAt: at('2026-10-07', '07:10'),
  updatedAt: 0,
}

const pay = (id: string, date: string, time: string, amountMinor: number, categoryId: string) =>
  ({ id, date, amountMinor, categoryId, createdAt: at(date, time), updatedAt: 0 }) as Payment

const source: TimelineSource = {
  workouts: [workout],
  sleep: [sleep],
  payments: [
    pay('p1', '2026-10-07', '12:15', 30000, 'cat_food'),
    pay('p2', '2026-10-07', '21:00', 5000, 'cat_transport'),
    pay('p3', '2026-10-08', '09:00', 10000, 'cat_food'),
  ],
}

const all = { types: ALL_ENTRY_TYPES, categoryId: null }

describe('buildTimeline', () => {
  it('groups by day, newest first, and orders each day by time', () => {
    const days = buildTimeline(source, all)
    expect(days.map((d) => d.date)).toEqual(['2026-10-08', '2026-10-07'])
    expect(days[1].items.map((i) => i.id)).toEqual(['p2', 'w1', 'p1', 's1'])
  })

  it('totals each day’s payments', () => {
    expect(buildTimeline(source, all).map((d) => d.spentMinor)).toEqual([10000, 35000])
  })

  it('filters by type', () => {
    const days = buildTimeline(source, { types: ['sleep', 'workout'], categoryId: null })
    expect(days).toHaveLength(1)
    expect(days[0].items.map((i) => i.type)).toEqual(['workout', 'sleep'])
    expect(days[0].spentMinor).toBe(0)
  })

  it('narrows payments by category without hiding other types', () => {
    const days = buildTimeline(source, { types: ALL_ENTRY_TYPES, categoryId: 'cat_food' })
    expect(days.flatMap((d) => d.items.map((i) => i.id))).toEqual(['p3', 'w1', 'p1', 's1'])
    expect(days[1].spentMinor).toBe(30000)
  })

  it('puts entries without a time at the end of the day', () => {
    const untimed = { ...workout, id: 'w2', startTime: undefined }
    const days = buildTimeline({ workouts: [untimed], sleep: [sleep], payments: [] }, all)
    expect(days[0].items.map((i) => i.id)).toEqual(['s1', 'w2'])
  })

  it('is empty with nothing logged', () => {
    expect(buildTimeline({ workouts: [], sleep: [], payments: [] }, all)).toEqual([])
  })
})
