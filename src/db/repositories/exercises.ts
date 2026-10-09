import type { GrindDB } from '@/db/database'
import {
  exerciseInputSchema,
  exerciseSchema,
  type Exercise,
  type ExerciseInput,
  type ExerciseKind,
  type ID,
} from '@/db/schema'
import { exerciseNameKey } from '@/db/seed'
import { createCrud } from '@/db/repositories/crud'
import { RecordNotFoundError, type CrudRepository, type RepoDeps } from '@/db/repositories/types'

export interface ExerciseRepository extends CrudRepository<Exercise, ExerciseInput> {
  /** Sorted by name. Archived exercises are excluded unless requested. */
  list(options?: { includeArchived?: boolean }): Promise<Exercise[]>
  getByName(name: string): Promise<Exercise | undefined>
  /** Returns the exercise with this name (case-insensitive), creating it if needed. */
  findOrCreate(name: string, kind?: ExerciseKind): Promise<Exercise>
  /**
   * Moves every workout and template entry from `sourceId` to `targetId`, then deletes the
   * source. For tidying up duplicates. Returns how many workouts changed.
   */
  merge(sourceId: ID, targetId: ID): Promise<number>
  /** Workouts per exercise, for showing how much each is used. */
  usageCounts(): Promise<Map<ID, number>>
}

export function createExerciseRepository(db: GrindDB, deps: RepoDeps): ExerciseRepository {
  const crud = createCrud<Exercise, ExerciseInput>({
    entity: 'Exercise',
    table: db.exercises,
    deps,
    build: (input, meta) => {
      const parsed = exerciseInputSchema.parse(input)
      return exerciseSchema.parse({ ...parsed, ...meta, nameKey: exerciseNameKey(parsed.name) })
    },
    duplicateMessage: (e) => `An exercise named "${e.name}" already exists`,
  })

  async function getByName(name: string) {
    return db.exercises.where('nameKey').equals(exerciseNameKey(name)).first()
  }

  return {
    ...crud,
    getByName,

    async list({ includeArchived = false } = {}) {
      const all = await db.exercises.toArray()
      return all
        .filter((e) => includeArchived || !e.archived)
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    async merge(sourceId, targetId) {
      if (sourceId === targetId) throw new Error('Can’t merge an exercise into itself')
      return db.transaction('rw', [db.exercises, db.workouts, db.templates], async () => {
        if (!(await db.exercises.get(sourceId))) throw new RecordNotFoundError('Exercise', sourceId)
        if (!(await db.exercises.get(targetId))) throw new RecordNotFoundError('Exercise', targetId)
        const workouts = await db.workouts.where('exerciseIds').equals(sourceId).toArray()
        const now = deps.now()
        for (const workout of workouts) {
          const swap = (id: ID) => (id === sourceId ? targetId : id)
          await db.workouts.put({
            ...workout,
            entries: workout.entries.map((e) => ({ ...e, exerciseId: swap(e.exerciseId) })),
            exerciseIds: [...new Set(workout.exerciseIds.map(swap))],
            updatedAt: Math.max(now, workout.updatedAt),
          })
        }
        // Templates aren't indexed by exercise, and there are only a handful.
        await db.templates.toCollection().modify((template) => {
          if (!template.entries.some((e) => e.exerciseId === sourceId)) return
          template.entries = template.entries.map((e) =>
            e.exerciseId === sourceId ? { ...e, exerciseId: targetId } : e,
          )
          template.updatedAt = Math.max(now, template.updatedAt)
        })
        await db.exercises.delete(sourceId)
        return workouts.length
      })
    },

    async usageCounts() {
      const counts = new Map<ID, number>()
      await db.workouts.each((w) => {
        for (const id of w.exerciseIds) counts.set(id, (counts.get(id) ?? 0) + 1)
      })
      return counts
    },

    async findOrCreate(name, kind = 'weighted') {
      return db.transaction('rw', db.exercises, async () => {
        return (await getByName(name)) ?? crud.create({ name, kind })
      })
    },
  }
}
