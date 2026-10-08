import type { ID, WeightUnit, Workout, WorkoutSet } from '@/db/schema'
import {
  addDaysToKey,
  isInRange,
  weekRange,
  type DayKey,
  type DayRange,
  type WeekStart,
} from '@/lib/dates'

// Pure aggregations over workouts. Weights are converted to one unit before
// they're compared, because each workout keeps the unit it was logged in.

const LB_PER_KG = 2.2046226218

export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight
  return from === 'kg' ? weight * LB_PER_KG : weight / LB_PER_KG
}

/** Estimated one-rep max (Epley). A single is its own max; 0 reps estimates nothing. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

function inRange(workouts: Workout[], range?: DayRange): Workout[] {
  return range ? workouts.filter((w) => isInRange(w.date, range)) : workouts
}

function chronological(a: Workout, b: Workout): number {
  return (
    a.date.localeCompare(b.date) ||
    (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
    a.createdAt - b.createdAt
  )
}

/** Every set of one exercise in a workout (it may appear in several entries). */
export function setsFor(workout: Workout, exerciseId: ID): WorkoutSet[] {
  return workout.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets)
}

/** Sum of reps × weight, in `unit`. Bodyweight sets add nothing. */
export function getVolume(workouts: Workout[], unit: WeightUnit, exerciseId?: ID): number {
  let total = 0
  for (const workout of workouts) {
    for (const entry of workout.entries) {
      if (exerciseId && entry.exerciseId !== exerciseId) continue
      for (const set of entry.sets) {
        if (set.weight) total += set.reps * convertWeight(set.weight, workout.unit, unit)
      }
    }
  }
  return total
}

export function countSets(workout: Workout): number {
  return workout.entries.reduce((sum, e) => sum + e.sets.length, 0)
}

export interface WorkoutFrequency {
  workouts: number
  /** Distinct days with at least one workout. */
  activeDays: number
  totalMinutes: number
}

export function getWorkoutFrequency(workouts: Workout[], range?: DayRange): WorkoutFrequency {
  const rows = inRange(workouts, range)
  return {
    workouts: rows.length,
    activeDays: new Set(rows.map((w) => w.date)).size,
    totalMinutes: rows.reduce((sum, w) => sum + (w.durationMin ?? 0), 0),
  }
}

/** Workouts per day, for the calendar heatmap. */
export function getDailyCounts(workouts: Workout[]): Record<DayKey, number> {
  const counts: Record<DayKey, number> = {}
  for (const w of workouts) counts[w.date] = (counts[w.date] ?? 0) + 1
  return counts
}

export interface WeekCount {
  weekStart: DayKey
  count: number
}

/** Workout counts for the `weeks` weeks ending with the week containing `today`, oldest first. */
export function getWeeklyCounts(
  workouts: Workout[],
  today: DayKey,
  weekStartsOn: WeekStart,
  weeks = 8,
): WeekCount[] {
  const lastStart = weekRange(today, weekStartsOn).start
  const counts = new Map<DayKey, number>()
  for (const w of workouts) {
    const start = weekRange(w.date, weekStartsOn).start
    counts.set(start, (counts.get(start) ?? 0) + 1)
  }
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDaysToKey(lastStart, -7 * (weeks - 1 - i))
    return { weekStart, count: counts.get(weekStart) ?? 0 }
  })
}

/**
 * Consecutive weeks with at least one workout, ending with this week. A week
 * that's still in progress without a workout doesn't break the streak yet.
 */
export function getStreak(workouts: Workout[], today: DayKey, weekStartsOn: WeekStart): number {
  const active = new Set(
    workouts.filter((w) => w.date <= today).map((w) => weekRange(w.date, weekStartsOn).start),
  )
  let week = weekRange(today, weekStartsOn).start
  if (!active.has(week)) week = addDaysToKey(week, -7)
  let streak = 0
  while (active.has(week)) {
    streak += 1
    week = addDaysToKey(week, -7)
  }
  return streak
}

export interface ExerciseUsage {
  exerciseId: ID
  /** Workouts that included it. */
  sessions: number
  sets: number
  lastDate: DayKey
}

/** Most-used exercises: by sessions, then sets, then most recent. */
export function getTopExercises(workouts: Workout[], limit = 5, range?: DayRange): ExerciseUsage[] {
  const usage = new Map<ID, ExerciseUsage>()
  for (const workout of inRange(workouts, range)) {
    for (const exerciseId of new Set(workout.entries.map((e) => e.exerciseId))) {
      const row = usage.get(exerciseId) ?? { exerciseId, sessions: 0, sets: 0, lastDate: '' }
      row.sessions += 1
      row.sets += setsFor(workout, exerciseId).length
      if (workout.date > row.lastDate) row.lastDate = workout.date
      usage.set(exerciseId, row)
    }
  }
  return [...usage.values()]
    .sort(
      (a, b) => b.sessions - a.sessions || b.sets - a.sets || b.lastDate.localeCompare(a.lastDate),
    )
    .slice(0, limit)
}

export interface ExerciseSession {
  workoutId: ID
  date: DayKey
  sets: WorkoutSet[]
  /** Heaviest weight lifted, in the requested unit; null for bodyweight-only sessions. */
  topWeight: number | null
  /** Reps of the heaviest set (most reps for bodyweight). */
  topReps: number
  bestE1rm: number | null
  volume: number
  totalReps: number
}

/** One point per workout that included the exercise, oldest first, in `unit`. */
export function getExerciseProgress(
  workouts: Workout[],
  exerciseId: ID,
  unit: WeightUnit,
): ExerciseSession[] {
  return workouts
    .filter((w) => w.entries.some((e) => e.exerciseId === exerciseId))
    .sort(chronological)
    .map((workout) => {
      const sets = setsFor(workout, exerciseId).map((s) =>
        s.weight === undefined ? s : { ...s, weight: convertWeight(s.weight, workout.unit, unit) },
      )
      const weighted = sets.filter((s) => (s.weight ?? 0) > 0 && s.reps > 0)
      const top = weighted.reduce<WorkoutSet | null>(
        (best, s) =>
          !best || s.weight! > best.weight! || (s.weight === best.weight && s.reps > best.reps)
            ? s
            : best,
        null,
      )
      return {
        workoutId: workout.id,
        date: workout.date,
        sets,
        topWeight: top?.weight ?? null,
        topReps: top?.reps ?? Math.max(0, ...sets.map((s) => s.reps)),
        bestE1rm: weighted.length
          ? Math.max(...weighted.map((s) => estimateOneRepMax(s.weight!, s.reps)))
          : null,
        volume: weighted.reduce((sum, s) => sum + s.reps * s.weight!, 0),
        totalReps: sets.reduce((sum, s) => sum + s.reps, 0),
      }
    })
}

export interface SetRecord {
  weight: number | null
  reps: number
  date: DayKey
  workoutId: ID
}

export interface PersonalRecords {
  heaviest: SetRecord | null
  bestE1rm: (SetRecord & { e1rm: number }) | null
  /** Most reps in a single set, at any weight. */
  mostReps: SetRecord | null
  /** Most reps at each weight, heaviest weight first. Only for weighted sets. */
  repsByWeight: SetRecord[]
}

/** Records for one exercise, in `unit`. Ties go to the earliest set: that's when it was set. */
export function getPersonalRecords(
  workouts: Workout[],
  exerciseId: ID,
  unit: WeightUnit,
): PersonalRecords {
  let heaviest: SetRecord | null = null
  let bestE1rm: PersonalRecords['bestE1rm'] = null
  let mostReps: SetRecord | null = null
  const byWeight = new Map<number, SetRecord>()

  for (const session of getExerciseProgress(workouts, exerciseId, unit)) {
    for (const set of session.sets) {
      if (set.reps <= 0) continue
      const weight = set.weight && set.weight > 0 ? roundWeight(set.weight) : null
      const record = { weight, reps: set.reps, date: session.date, workoutId: session.workoutId }
      if (!mostReps || set.reps > mostReps.reps) mostReps = record
      if (weight === null) continue
      if (
        !heaviest ||
        weight > heaviest.weight! ||
        (weight === heaviest.weight && set.reps > heaviest.reps)
      ) {
        heaviest = record
      }
      const e1rm = estimateOneRepMax(weight, set.reps)
      if (!bestE1rm || e1rm > bestE1rm.e1rm) bestE1rm = { ...record, e1rm }
      const atWeight = byWeight.get(weight)
      if (!atWeight || set.reps > atWeight.reps) byWeight.set(weight, record)
    }
  }

  return {
    heaviest,
    bestE1rm,
    mostReps,
    repsByWeight: [...byWeight.values()].sort((a, b) => b.weight! - a.weight!),
  }
}

/** Converted weights pick up float noise (60 kg → 132.277… lb); records group on 0.01. */
function roundWeight(weight: number): number {
  return Math.round(weight * 100) / 100
}

export type RecordKind = 'heaviest' | 'e1rm' | 'reps'

export interface NewRecord {
  exerciseId: ID
  kinds: RecordKind[]
}

/**
 * Which exercises in `workout` beat every earlier workout's records. An
 * exercise done for the first time isn't a record: there's nothing to beat.
 */
export function findNewRecords(workout: Workout, history: Workout[]): NewRecord[] {
  const earlier = history.filter((w) => w.id !== workout.id && chronological(w, workout) < 0)
  const results: NewRecord[] = []
  for (const exerciseId of new Set(workout.entries.map((e) => e.exerciseId))) {
    const before = getPersonalRecords(earlier, exerciseId, workout.unit)
    if (!before.mostReps) continue
    const now = getPersonalRecords([workout], exerciseId, workout.unit)
    const kinds: RecordKind[] = []
    if (now.heaviest && (!before.heaviest || now.heaviest.weight! > before.heaviest.weight!)) {
      kinds.push('heaviest')
    }
    if (now.bestE1rm && (!before.bestE1rm || now.bestE1rm.e1rm > before.bestE1rm.e1rm + 0.01)) {
      kinds.push('e1rm')
    }
    // Bodyweight exercises only have reps to beat.
    if (!now.heaviest && now.mostReps && now.mostReps.reps > before.mostReps.reps) {
      kinds.push('reps')
    }
    if (kinds.length) results.push({ exerciseId, kinds })
  }
  return results
}
