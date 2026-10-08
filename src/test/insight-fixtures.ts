import type { Category, Exercise, Payment, Sleep, Workout, WorkoutEntry } from '@/db/schema'
import type { InsightContext, InsightData, InsightSettings } from '@/lib/calculations/insights'
import { addDaysToKey, resolveSleepTimes } from '@/lib/dates'

// Small builders for insight rule tests.

let seq = 0
const next = () => ++seq

export const SETTINGS: InsightSettings = {
  currency: 'NPR',
  weightUnit: 'kg',
  weekStartsOn: 0,
  sleepTargetMin: 480,
}

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Food',
    icon: 'utensils',
    color: '#f97316',
    order: 0,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'fun',
    name: 'Fun',
    icon: 'clapperboard',
    color: '#a855f7',
    order: 1,
    createdAt: 0,
    updatedAt: 0,
  },
]

export const EXERCISES: Exercise[] = [
  {
    id: 'bench',
    name: 'Bench Press',
    nameKey: 'bench press',
    kind: 'weighted',
    createdAt: 0,
    updatedAt: 0,
  },
  { id: 'dips', name: 'Dips', nameKey: 'dips', kind: 'bodyweight', createdAt: 0, updatedAt: 0 },
  { id: 'squat', name: 'Squat', nameKey: 'squat', kind: 'weighted', createdAt: 0, updatedAt: 0 },
]

export function pay(
  date: string,
  amountMinor: number,
  categoryId = 'food',
  merchant?: string,
): Payment {
  const n = next()
  return { id: `p${n}`, date, amountMinor, categoryId, merchant, createdAt: n, updatedAt: n }
}

/** A night ending on the morning of `date`. */
export function night(date: string, bed: string, wake: string): Sleep {
  const n = next()
  return { id: `s${n}`, date, ...resolveSleepTimes(date, bed, wake), createdAt: n, updatedAt: n }
}

/** A night of exactly `minutes`, waking at 07:00. */
export function nightOf(date: string, minutes: number): Sleep {
  const bed = (7 * 60 - minutes + 24 * 60) % (24 * 60)
  const hh = String(Math.floor(bed / 60)).padStart(2, '0')
  const mm = String(bed % 60).padStart(2, '0')
  return night(date, `${hh}:${mm}`, '07:00')
}

export function workout(date: string, entries: WorkoutEntry[] = [], startTime?: string): Workout {
  const n = next()
  return {
    id: `w${n}`,
    date,
    name: 'Push',
    startTime,
    unit: 'kg',
    entries,
    exerciseIds: [...new Set(entries.map((e) => e.exerciseId))],
    createdAt: n,
    updatedAt: n,
  }
}

export const sets = (exerciseId: string, ...pairs: Array<[reps: number, weight?: number]>) => ({
  exerciseId,
  sets: pairs.map(([reps, weight]) => (weight === undefined ? { reps } : { reps, weight })),
})

/** `count` days ending `endOffset` days before `today`, newest first. */
export function days(today: string, count: number, endOffset = 0): string[] {
  return Array.from({ length: count }, (_, i) => addDaysToKey(today, -(endOffset + i)))
}

export function context(
  today: string,
  data: Partial<InsightData> = {},
  settings = SETTINGS,
): InsightContext {
  return {
    today,
    settings,
    data: {
      workouts: [],
      sleep: [],
      payments: [],
      categories: CATEGORIES,
      exercises: EXERCISES,
      ...data,
    },
  }
}

/** Money uses a non-breaking space after the symbol; plain spaces read better in expectations. */
export function plain<T extends { title: string; detail?: string }>(insights: T[]): T[] {
  return insights.map((i) => ({
    ...i,
    title: i.title.replace(/ /g, ' '),
    detail: i.detail?.replace(/ /g, ' '),
  }))
}
