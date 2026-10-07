import type { Table } from 'dexie'
import type { ID, Meta } from '@/db/schema'
import {
  DuplicateRecordError,
  RecordNotFoundError,
  type CrudRepository,
  type RepoDeps,
} from '@/db/repositories/types'

interface CrudConfig<T extends Meta, TInput> {
  entity: string
  table: Table<T, ID>
  deps: RepoDeps
  /** Validates input and builds the stored entity (including derived fields). */
  build: (input: TInput, meta: Meta) => T
  /** Async checks that need the database, e.g. referential integrity. */
  check?: (entity: T) => Promise<void>
  /** Other tables `check` reads, so updates can include them in their transaction. */
  checkTables?: Table[]
  /** Message used when a unique index rejects the write. */
  duplicateMessage?: (entity: T) => string
}

export function createCrud<T extends Meta, TInput>({
  entity,
  table,
  deps,
  build,
  check,
  checkTables = [],
  duplicateMessage,
}: CrudConfig<T, TInput>): CrudRepository<T, TInput> {
  async function write(record: T, op: 'add' | 'put'): Promise<T> {
    await check?.(record)
    try {
      await (op === 'add' ? table.add(record) : table.put(record))
    } catch (error) {
      if (duplicateMessage && error instanceof Error && error.name === 'ConstraintError') {
        throw new DuplicateRecordError(duplicateMessage(record))
      }
      throw error
    }
    return record
  }

  return {
    async create(input) {
      const now = deps.now()
      return write(build(input, { id: deps.newId(), createdAt: now, updatedAt: now }), 'add')
    },

    async update(id, patch) {
      return table.db.transaction('rw', [table, ...checkTables], async () => {
        const existing = await table.get(id)
        if (!existing) throw new RecordNotFoundError(entity, id)
        // Extra stored fields (id, derived values) are stripped by the input schema.
        const merged = { ...existing, ...patch } as unknown as TInput
        const record = build(merged, {
          id,
          createdAt: existing.createdAt,
          updatedAt: Math.max(deps.now(), existing.updatedAt),
        })
        return write(record, 'put')
      })
    },

    async remove(id: ID) {
      await table.delete(id)
    },

    async getById(id: ID) {
      return table.get(id)
    },
  }
}

/** Newest first: by date, then by creation time. */
export function byDateDesc<T extends { date: string; createdAt: number }>(a: T, b: T): number {
  return b.date.localeCompare(a.date) || b.createdAt - a.createdAt
}
