import type { GrindDB } from '@/db/database'
import {
  paymentInputSchema,
  paymentSchema,
  type ID,
  type Payment,
  type PaymentInput,
} from '@/db/schema'
import { byDateDesc, createCrud } from '@/db/repositories/crud'
import { RecordNotFoundError, type RangeRepository, type RepoDeps } from '@/db/repositories/types'
import type { DayRange } from '@/lib/dates'

export interface PaymentRepository extends RangeRepository<Payment, PaymentInput> {
  listByCategory(categoryId: ID, range?: DayRange): Promise<Payment[]>
  /** Distinct merchants, most recently used first, for autocomplete. */
  recentMerchants(limit?: number): Promise<string[]>
}

export function createPaymentRepository(db: GrindDB, deps: RepoDeps): PaymentRepository {
  const crud = createCrud<Payment, PaymentInput>({
    entity: 'Payment',
    table: db.payments,
    deps,
    build: (input, meta) => paymentSchema.parse({ ...paymentInputSchema.parse(input), ...meta }),
    check: async (payment) => {
      if (!(await db.categories.get(payment.categoryId))) {
        throw new RecordNotFoundError('Category', payment.categoryId)
      }
    },
    checkTables: [db.categories],
  })

  return {
    ...crud,

    async listByRange(range) {
      const rows = await db.payments
        .where('date')
        .between(range.start, range.end, true, true)
        .toArray()
      return rows.sort(byDateDesc)
    },

    async listByCategory(categoryId, range) {
      const rows = range
        ? await db.payments
            .where('[categoryId+date]')
            .between([categoryId, range.start], [categoryId, range.end], true, true)
            .toArray()
        : await db.payments.where('categoryId').equals(categoryId).toArray()
      return rows.sort(byDateDesc)
    },

    async recentMerchants(limit = 10) {
      const recent = await db.payments.orderBy('updatedAt').reverse().limit(200).toArray()
      const seen = new Map<string, string>()
      for (const { merchant } of recent) {
        if (!merchant) continue
        const key = merchant.toLowerCase()
        if (!seen.has(key)) seen.set(key, merchant)
        if (seen.size >= limit) break
      }
      return [...seen.values()]
    },
  }
}
