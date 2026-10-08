import { z } from 'zod'
import type { Payment, PaymentInput } from '@/db/schema'
import { isDayKey, todayKey } from '@/lib/dates'
import { fromMinor, parseMoneyInput } from '@/lib/money'

/** What the form edits: strings, as typed. */
export interface PaymentFormValues {
  amount: string
  categoryId: string
  merchant: string
  date: string
  notes: string
}

/** Validates form values and converts them to a repository input. */
export function paymentFormSchema(currency: string) {
  return z
    .object({
      // Checked on the field (not in the transform) so it's reported alongside other errors.
      amount: z.string().superRefine((amount, ctx) => {
        const minor = parseMoneyInput(amount, currency)
        if (minor === null && amount.trim() !== '') {
          ctx.addIssue({ code: 'custom', message: 'Enter a valid amount' })
        } else if (minor === null || minor <= 0) {
          ctx.addIssue({ code: 'custom', message: 'Enter an amount' })
        }
      }),
      categoryId: z.string().min(1, 'Pick a category'),
      merchant: z.string().trim().max(120, 'Keep it under 120 characters'),
      date: z.string().refine(isDayKey, 'Pick a date'),
      notes: z.string().trim().max(2000, 'Keep it under 2000 characters'),
    })
    .transform((values): PaymentInput => ({
      amountMinor: parseMoneyInput(values.amount, currency)!,
      categoryId: values.categoryId,
      date: values.date,
      merchant: values.merchant || undefined,
      notes: values.notes || undefined,
    }))
}

export function emptyPaymentForm(today = todayKey()): PaymentFormValues {
  return { amount: '', categoryId: '', merchant: '', date: today, notes: '' }
}

export function paymentToForm(payment: Payment, currency: string): PaymentFormValues {
  return {
    amount: String(fromMinor(payment.amountMinor, currency)),
    categoryId: payment.categoryId,
    merchant: payment.merchant ?? '',
    date: payment.date,
    notes: payment.notes ?? '',
  }
}

/** Every editable field, with absent optionals as explicit `undefined` so an update clears them. */
export function paymentToInput(payment: Payment): PaymentInput {
  return {
    amountMinor: payment.amountMinor,
    categoryId: payment.categoryId,
    date: payment.date,
    merchant: payment.merchant,
    notes: payment.notes,
  }
}
