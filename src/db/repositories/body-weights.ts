import type { GrindDB } from '@/db/database'
import {
  bodyWeightInputSchema,
  bodyWeightSchema,
  type BodyWeight,
  type BodyWeightInput,
  type ID,
} from '@/db/schema'
import { byDateDesc, createCrud } from '@/db/repositories/crud'
import type { RangeRepository, RepoDeps } from '@/db/repositories/types'
import type { DayKey } from '@/lib/dates'

export interface BodyWeightRepository extends RangeRepository<BodyWeight, BodyWeightInput> {
  /** There is at most one entry per day. */
  getByDate(date: DayKey): Promise<BodyWeight | undefined>
  getLatest(): Promise<BodyWeight | undefined>
  /** Every entry, newest first. */
  listAll(): Promise<BodyWeight[]>
  /** Every logged day and its entry id, for spotting duplicates before saving. */
  loggedDays(): Promise<Map<DayKey, ID>>
}

export function createBodyWeightRepository(db: GrindDB, deps: RepoDeps): BodyWeightRepository {
  const crud = createCrud<BodyWeight, BodyWeightInput>({
    entity: 'Body weight',
    table: db.bodyWeights,
    deps,
    build: (input, meta) =>
      bodyWeightSchema.parse({ ...bodyWeightInputSchema.parse(input), ...meta }),
    duplicateMessage: (b) => `Body weight for ${b.date} is already logged`,
  })

  return {
    ...crud,

    async earliestDate() {
      return (await db.bodyWeights.orderBy('date').first())?.date
    },

    async listByRange(range) {
      const rows = await db.bodyWeights
        .where('date')
        .between(range.start, range.end, true, true)
        .toArray()
      return rows.sort(byDateDesc)
    },

    async getByDate(date) {
      return db.bodyWeights.where('date').equals(date).first()
    },

    async getLatest() {
      return db.bodyWeights.orderBy('date').last()
    },

    async listAll() {
      return (await db.bodyWeights.orderBy('date').reverse().toArray()).sort(byDateDesc)
    },

    async loggedDays() {
      const days = new Map<DayKey, ID>()
      await db.bodyWeights.each((b) => days.set(b.date, b.id))
      return days
    },
  }
}
