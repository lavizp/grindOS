import type { DayKey, DayRange } from '@/lib/dates'
import type { ID } from '@/db/schema'

export interface RepoDeps {
  now: () => number
  newId: () => ID
}

export const defaultDeps: RepoDeps = {
  now: () => Date.now(),
  newId: () => crypto.randomUUID(),
}

/** Storage-agnostic CRUD contract, so a synced backend can replace Dexie later. */
export interface CrudRepository<T, TInput> {
  create(input: TInput): Promise<T>
  /** Merges `patch` into the record. Pass `undefined` to clear an optional field. */
  update(id: ID, patch: Partial<TInput>): Promise<T>
  remove(id: ID): Promise<void>
  getById(id: ID): Promise<T | undefined>
}

export interface RangeRepository<T, TInput> extends CrudRepository<T, TInput> {
  /** Records whose `date` falls in the inclusive range, newest first. */
  listByRange(range: DayRange): Promise<T[]>
  /** The oldest record's date, or undefined when there are none. */
  earliestDate(): Promise<DayKey | undefined>
}

// Names must not collide with Dexie's built-in error names (e.g. "NotFoundError"),
// or Dexie re-wraps them as its own error types inside transactions.
export class RecordNotFoundError extends Error {
  constructor(entity: string, id: ID) {
    super(`${entity} not found: ${id}`)
    this.name = 'RecordNotFoundError'
  }
}

export class DuplicateRecordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DuplicateRecordError'
  }
}
