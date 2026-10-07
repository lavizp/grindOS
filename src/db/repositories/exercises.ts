import type { GrindDB } from '@/db/database'
import {
  exerciseInputSchema,
  exerciseSchema,
  type Exercise,
  type ExerciseInput,
  type ExerciseKind,
} from '@/db/schema'
import { exerciseNameKey } from '@/db/seed'
import { createCrud } from '@/db/repositories/crud'
import type { CrudRepository, RepoDeps } from '@/db/repositories/types'

export interface ExerciseRepository extends CrudRepository<Exercise, ExerciseInput> {
  /** Sorted by name. Archived exercises are excluded unless requested. */
  list(options?: { includeArchived?: boolean }): Promise<Exercise[]>
  getByName(name: string): Promise<Exercise | undefined>
  /** Returns the exercise with this name (case-insensitive), creating it if needed. */
  findOrCreate(name: string, kind?: ExerciseKind): Promise<Exercise>
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

    async findOrCreate(name, kind = 'weighted') {
      return db.transaction('rw', db.exercises, async () => {
        return (await getByName(name)) ?? crud.create({ name, kind })
      })
    },
  }
}
