import type { GrindDB } from '@/db/database'
import { sleepInputSchema, sleepSchema, type ID, type Sleep, type SleepInput } from '@/db/schema'
import { byDateDesc, createCrud } from '@/db/repositories/crud'
import type { RangeRepository, RepoDeps } from '@/db/repositories/types'
import type { DayKey } from '@/lib/dates'

export interface SleepRepository extends RangeRepository<Sleep, SleepInput> {
  /** There is at most one entry per night (keyed by wake-up day). */
  getByDate(date: DayKey): Promise<Sleep | undefined>
  getLatest(): Promise<Sleep | undefined>
  /** Every logged night's date and entry id, for spotting duplicates before saving. */
  loggedNights(): Promise<Map<DayKey, ID>>
}

export function createSleepRepository(db: GrindDB, deps: RepoDeps): SleepRepository {
  const crud = createCrud<Sleep, SleepInput>({
    entity: 'Sleep',
    table: db.sleep,
    deps,
    build: (input, meta) => sleepSchema.parse({ ...sleepInputSchema.parse(input), ...meta }),
    duplicateMessage: (s) => `Sleep for ${s.date} is already logged`,
  })

  return {
    ...crud,

    async earliestDate() {
      return (await db.sleep.orderBy('date').first())?.date
    },

    async listByRange(range) {
      const rows = await db.sleep
        .where('date')
        .between(range.start, range.end, true, true)
        .toArray()
      return rows.sort(byDateDesc)
    },

    async getByDate(date) {
      return db.sleep.where('date').equals(date).first()
    },

    async getLatest() {
      return db.sleep.orderBy('date').last()
    },

    async loggedNights() {
      const nights = new Map<DayKey, ID>()
      await db.sleep.each((s) => nights.set(s.date, s.id))
      return nights
    },
  }
}
