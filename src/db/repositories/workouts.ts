import type { GrindDB } from '@/db/database'
import {
  workoutInputSchema,
  workoutSchema,
  type ID,
  type Workout,
  type WorkoutInput,
} from '@/db/schema'
import { byDateDesc, createCrud } from '@/db/repositories/crud'
import type { RangeRepository, RepoDeps } from '@/db/repositories/types'

export interface WorkoutRepository extends RangeRepository<Workout, WorkoutInput> {
  /** Every workout that includes the exercise, newest first. */
  listByExercise(exerciseId: ID): Promise<Workout[]>
  /** Most recent workout with this name, for "repeat last Push". */
  getLatestByName(name: string): Promise<Workout | undefined>
  /** The latest workouts, newest first: hints, repeats and name chips come from these. */
  listRecent(limit?: number): Promise<Workout[]>
  /** Distinct workout names, most recent first, for quick-pick chips. */
  recentNames(limit?: number): Promise<string[]>
}

export function createWorkoutRepository(db: GrindDB, deps: RepoDeps): WorkoutRepository {
  const crud = createCrud<Workout, WorkoutInput>({
    entity: 'Workout',
    table: db.workouts,
    deps,
    build: (input, meta) => {
      const parsed = workoutInputSchema.parse(input)
      const exerciseIds = [...new Set(parsed.entries.map((e) => e.exerciseId))]
      return workoutSchema.parse({ ...parsed, ...meta, exerciseIds })
    },
  })

  return {
    ...crud,

    async earliestDate() {
      return (await db.workouts.orderBy('date').first())?.date
    },

    async listByRange(range) {
      const rows = await db.workouts
        .where('date')
        .between(range.start, range.end, true, true)
        .toArray()
      return rows.sort(byDateDesc)
    },

    async listByExercise(exerciseId) {
      const rows = await db.workouts.where('exerciseIds').equals(exerciseId).toArray()
      return rows.sort(byDateDesc)
    },

    async getLatestByName(name) {
      const rows = await db.workouts.where('name').equals(name.trim()).toArray()
      return rows.sort(byDateDesc)[0]
    },

    async listRecent(limit = 200) {
      const rows = await db.workouts.orderBy('date').reverse().limit(limit).toArray()
      return rows.sort(byDateDesc)
    },

    async recentNames(limit = 8) {
      const recent = await db.workouts.orderBy('date').reverse().limit(100).toArray()
      return [...new Set(recent.sort(byDateDesc).map((w) => w.name))].slice(0, limit)
    },
  }
}
