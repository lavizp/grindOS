import type { GrindDB } from '@/db/database'
import {
  templateInputSchema,
  templateSchema,
  type WorkoutTemplate,
  type WorkoutTemplateInput,
} from '@/db/schema'
import { exerciseNameKey } from '@/db/seed'
import { createCrud } from '@/db/repositories/crud'
import type { CrudRepository, RepoDeps } from '@/db/repositories/types'

export interface TemplateRepository extends CrudRepository<WorkoutTemplate, WorkoutTemplateInput> {
  /** Sorted by name. */
  list(): Promise<WorkoutTemplate[]>
  getByName(name: string): Promise<WorkoutTemplate | undefined>
}

export function createTemplateRepository(db: GrindDB, deps: RepoDeps): TemplateRepository {
  const crud = createCrud<WorkoutTemplate, WorkoutTemplateInput>({
    entity: 'Template',
    table: db.templates,
    deps,
    build: (input, meta) => {
      const parsed = templateInputSchema.parse(input)
      return templateSchema.parse({ ...parsed, ...meta, nameKey: exerciseNameKey(parsed.name) })
    },
    duplicateMessage: (t) => `A template named "${t.name}" already exists`,
  })

  return {
    ...crud,

    async list() {
      const all = await db.templates.toArray()
      return all.sort((a, b) => a.name.localeCompare(b.name))
    },

    async getByName(name) {
      return db.templates.where('nameKey').equals(exerciseNameKey(name)).first()
    },
  }
}
