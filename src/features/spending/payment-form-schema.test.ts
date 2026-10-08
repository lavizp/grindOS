import type { Payment } from '@/db/schema'
import {
  emptyPaymentForm,
  paymentFormSchema,
  paymentToForm,
} from '@/features/spending/payment-form-schema'

const schema = paymentFormSchema('NPR')
const valid = { ...emptyPaymentForm('2026-10-08'), amount: '1,250.5', categoryId: 'cat_food' }

function errors(values: object) {
  const result = schema.safeParse(values)
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]))
}

describe('paymentFormSchema', () => {
  it('converts to a repository input', () => {
    expect(schema.parse({ ...valid, merchant: '  Bhatbhateni ', notes: '' })).toEqual({
      amountMinor: 125050,
      categoryId: 'cat_food',
      date: '2026-10-08',
      merchant: 'Bhatbhateni',
      notes: undefined,
    })
  })

  it('requires an amount greater than 0', () => {
    expect(errors({ ...valid, amount: '' })).toEqual({ amount: 'Enter an amount' })
    expect(errors({ ...valid, amount: '0' })).toEqual({ amount: 'Enter an amount' })
    expect(errors({ ...valid, amount: '0.00' })).toEqual({ amount: 'Enter an amount' })
  })

  it('rejects malformed or over-precise amounts', () => {
    expect(errors({ ...valid, amount: '12.345' })).toEqual({ amount: 'Enter a valid amount' })
    expect(errors({ ...valid, amount: 'abc' })).toEqual({ amount: 'Enter a valid amount' })
  })

  it('reports every invalid field at once', () => {
    expect(errors({ ...valid, amount: '', categoryId: '' })).toEqual({
      amount: 'Enter an amount',
      categoryId: 'Pick a category',
    })
  })

  it('requires a category', () => {
    expect(errors({ ...valid, categoryId: '' })).toEqual({ categoryId: 'Pick a category' })
  })

  it('respects the currency decimals', () => {
    expect(paymentFormSchema('JPY').safeParse({ ...valid, amount: '12.5' }).success).toBe(false)
    expect(paymentFormSchema('JPY').parse({ ...valid, amount: '1250' }).amountMinor).toBe(1250)
  })
})

describe('paymentToForm', () => {
  it('round-trips through the schema', () => {
    const payment: Payment = {
      id: 'p1',
      date: '2026-10-01',
      amountMinor: 99950,
      categoryId: 'cat_bills',
      merchant: 'NEA',
      createdAt: 1,
      updatedAt: 1,
    }
    const form = paymentToForm(payment, 'NPR')
    expect(form).toMatchObject({ amount: '999.5', merchant: 'NEA', notes: '' })
    expect(schema.parse(form)).toMatchObject({ amountMinor: 99950, merchant: 'NEA' })
  })
})
