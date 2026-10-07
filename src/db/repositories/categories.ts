import type { GrindDB } from '@/db/database'
import {
  categoryInputSchema,
  categorySchema,
  type Category,
  type CategoryInput,
  type ID,
} from '@/db/schema'
import { createCrud } from '@/db/repositories/crud'
import type { CrudRepository, RepoDeps } from '@/db/repositories/types'

export type NewCategoryInput = Omit<CategoryInput, 'order'> & { order?: number }

export interface CategoryRepository extends Omit<
  CrudRepository<Category, CategoryInput>,
  'create' | 'remove'
> {
  /** Appends to the end of the list unless `order` is given. */
  create(input: NewCategoryInput): Promise<Category>
  /** Sorted by `order`. Archived categories are excluded unless requested. */
  list(options?: { includeArchived?: boolean }): Promise<Category[]>
  /** Categories are archived, never deleted, so existing payments keep their category. */
  archive(id: ID): Promise<Category>
  /** Sets `order` to match the position of each id in `ids`. */
  reorder(ids: ID[]): Promise<void>
}

export function createCategoryRepository(db: GrindDB, deps: RepoDeps): CategoryRepository {
  const crud = createCrud<Category, CategoryInput>({
    entity: 'Category',
    table: db.categories,
    deps,
    build: (input, meta) => categorySchema.parse({ ...categoryInputSchema.parse(input), ...meta }),
  })

  return {
    getById: crud.getById,
    update: crud.update,

    async create(input) {
      return db.transaction('rw', db.categories, async () => {
        const last = await db.categories.orderBy('order').last()
        return crud.create({ ...input, order: input.order ?? (last ? last.order + 1 : 0) })
      })
    },

    async list({ includeArchived = false } = {}) {
      const all = await db.categories.orderBy('order').toArray()
      return all.filter((c) => includeArchived || !c.archived)
    },

    async archive(id) {
      return crud.update(id, { archived: true })
    },

    async reorder(ids) {
      await db.transaction('rw', db.categories, async () => {
        for (const [order, id] of ids.entries()) {
          await crud.update(id, { order })
        }
      })
    },
  }
}
