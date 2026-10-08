import { format } from 'date-fns'
import { z } from 'zod'
import type { WeightUnit, Workout, WorkoutInput, WorkoutSet } from '@/db/schema'
import { convertWeight } from '@/lib/calculations/workouts'
import { isDayKey, TIME_OF_DAY_PATTERN, todayKey } from '@/lib/dates'

/** What the form edits: strings, as typed. */
export interface SetValues {
  reps: string
  weight: string
}

export interface EntryValues {
  exerciseId: string
  sets: SetValues[]
}

export interface WorkoutFormValues {
  name: string
  date: string
  startTime: string
  durationMin: string
  notes: string
  entries: EntryValues[]
}

export const DEFAULT_WORKOUT_NAMES = ['Push', 'Pull', 'Legs', 'Run']

/** "62.5" or "62,5" → 62.5. Null for anything that isn't a plain number. */
export function parseNumberInput(value: string): number | null {
  const text = value.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return null
  return Number(text)
}

const repsField = z.string().superRefine((value, ctx) => {
  const reps = parseNumberInput(value)
  if (value.trim() === '') ctx.addIssue({ code: 'custom', message: 'Enter reps' })
  else if (reps === null || !Number.isInteger(reps) || reps < 1 || reps > 1000) {
    ctx.addIssue({ code: 'custom', message: 'Reps must be a whole number' })
  }
})

const weightField = z.string().superRefine((value, ctx) => {
  if (value.trim() === '') return
  const weight = parseNumberInput(value)
  if (weight === null || weight > 2000) {
    ctx.addIssue({ code: 'custom', message: 'Enter a valid weight' })
  }
})

/** Validates form values and converts them to a repository input. */
export function workoutFormSchema({
  unit,
  today = todayKey(),
}: {
  unit: WeightUnit
  today?: string
}) {
  return z
    .object({
      name: z.string().trim().min(1, 'Name the workout').max(60, 'Keep it under 60 characters'),
      date: z.string().superRefine((date, ctx) => {
        if (!isDayKey(date)) ctx.addIssue({ code: 'custom', message: 'Pick a date' })
        else if (date > today) ctx.addIssue({ code: 'custom', message: 'Pick today or earlier' })
      }),
      startTime: z
        .string()
        .refine((v) => v === '' || TIME_OF_DAY_PATTERN.test(v), 'Pick a start time'),
      durationMin: z.string().refine((v) => {
        if (v.trim() === '') return true
        const minutes = parseNumberInput(v)
        return minutes !== null && Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440
      }, 'Enter minutes, from 1 to 1440'),
      notes: z.string().trim().max(2000, 'Keep it under 2000 characters'),
      entries: z.array(
        z.object({
          exerciseId: z.string().min(1),
          sets: z.array(z.object({ reps: repsField, weight: weightField })).min(1, 'Add a set'),
        }),
      ),
    })
    .transform((values): WorkoutInput => ({
      name: values.name,
      date: values.date,
      startTime: values.startTime || undefined,
      durationMin: values.durationMin.trim() ? parseNumberInput(values.durationMin)! : undefined,
      notes: values.notes || undefined,
      unit,
      entries: values.entries.map((entry) => ({
        exerciseId: entry.exerciseId,
        sets: entry.sets.map(toSet),
      })),
    }))
}

function toSet(values: SetValues): WorkoutSet {
  const weight = parseNumberInput(values.weight)
  const reps = parseNumberInput(values.reps)!
  return weight ? { reps, weight } : { reps }
}

export function toSetValues(set: WorkoutSet): SetValues {
  return { reps: String(set.reps), weight: set.weight === undefined ? '' : String(set.weight) }
}

/** A new workout for today, starting now. */
export function emptyWorkoutForm(now = new Date()): WorkoutFormValues {
  return {
    name: '',
    date: todayKey(now),
    startTime: format(now, 'HH:mm'),
    durationMin: '',
    notes: '',
    entries: [],
  }
}

export function workoutToForm(workout: Workout): WorkoutFormValues {
  return {
    name: workout.name,
    date: workout.date,
    startTime: workout.startTime ?? '',
    durationMin: workout.durationMin === undefined ? '' : String(workout.durationMin),
    notes: workout.notes ?? '',
    entries: workout.entries.map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets.map(toSetValues),
    })),
  }
}

/** Every editable field, with absent optionals as explicit `undefined` so an update clears them. */
export function workoutToInput(workout: Workout): WorkoutInput {
  return {
    name: workout.name,
    date: workout.date,
    startTime: workout.startTime,
    durationMin: workout.durationMin,
    notes: workout.notes,
    unit: workout.unit,
    entries: workout.entries,
  }
}

/** Sets from an earlier workout, in this workout's unit, rounded to 0.25. */
export function copySets(sets: WorkoutSet[], from: WeightUnit, to: WeightUnit): SetValues[] {
  return sets.map((set) =>
    toSetValues(
      set.weight === undefined
        ? set
        : { ...set, weight: Math.round(convertWeight(set.weight, from, to) * 4) / 4 },
    ),
  )
}

/** "Repeat last Push": the earlier workout's exercises and sets. */
export function repeatEntries(previous: Workout, unit: WeightUnit): EntryValues[] {
  return previous.entries.map((e) => ({
    exerciseId: e.exerciseId,
    sets: copySets(e.sets, previous.unit, unit),
  }))
}

/** Whether a new workout has anything worth keeping as a draft. */
export function hasProgress(values: WorkoutFormValues): boolean {
  return values.name.trim() !== '' || values.entries.length > 0 || values.notes.trim() !== ''
}
