import type { Payment } from '@/db/schema'
import {
  compareMonths,
  comparePeriods,
  getAverageDaily,
  getDailySpending,
  getLargestExpenses,
  getMonthlySpending,
  getSpendingByCategory,
  getTopCategories,
  getTotalSpending,
  groupByDay,
} from '@/lib/calculations/spending'
import { elapsedRange } from '@/lib/dates'

let seq = 0
function pay(date: string, amountMinor: number, categoryId = 'cat_food'): Payment {
  seq += 1
  return { id: `p${seq}`, date, amountMinor, categoryId, createdAt: seq, updatedAt: seq }
}

const october = { start: '2026-10-01', end: '2026-10-31' }

describe('getTotalSpending', () => {
  it('sums everything, or only the range', () => {
    const rows = [pay('2026-09-30', 100), pay('2026-10-01', 250), pay('2026-10-31', 50)]
    expect(getTotalSpending(rows)).toBe(400)
    expect(getTotalSpending(rows, october)).toBe(300)
  })

  it('is 0 for no payments', () => {
    expect(getTotalSpending([], october)).toBe(0)
  })
})

describe('getSpendingByCategory', () => {
  const rows = [
    pay('2026-10-01', 600, 'cat_food'),
    pay('2026-10-02', 300, 'cat_bills'),
    pay('2026-10-03', 100, 'cat_food'),
    pay('2026-09-01', 9999, 'cat_bills'),
  ]

  it('groups, counts and ranks by total', () => {
    expect(getSpendingByCategory(rows, october)).toEqual([
      { categoryId: 'cat_food', totalMinor: 700, count: 2, share: 0.7 },
      { categoryId: 'cat_bills', totalMinor: 300, count: 1, share: 0.3 },
    ])
  })

  it('limits for top categories', () => {
    expect(getTopCategories(rows, 1, october).map((c) => c.categoryId)).toEqual(['cat_food'])
  })

  it('is empty without payments', () => {
    expect(getSpendingByCategory([], october)).toEqual([])
  })
})

describe('getDailySpending', () => {
  it('fills every day in the range', () => {
    const rows = [pay('2026-10-02', 100), pay('2026-10-02', 50), pay('2026-10-04', 10)]
    expect(getDailySpending(rows, { start: '2026-10-01', end: '2026-10-04' })).toEqual([
      { date: '2026-10-01', totalMinor: 0 },
      { date: '2026-10-02', totalMinor: 150 },
      { date: '2026-10-03', totalMinor: 0 },
      { date: '2026-10-04', totalMinor: 10 },
    ])
  })
})

describe('getMonthlySpending', () => {
  it('returns the last N months oldest first, across a year boundary', () => {
    const rows = [
      pay('2025-11-30', 100),
      pay('2026-01-15', 40),
      pay('2026-01-02', 2),
      pay('2025-10-01', 7),
    ]
    expect(getMonthlySpending(rows, '2026-01-20', 3)).toEqual([
      { month: '2025-11', totalMinor: 100 },
      { month: '2025-12', totalMinor: 0 },
      { month: '2026-01', totalMinor: 42 },
    ])
  })
})

describe('getLargestExpenses', () => {
  it('sorts by amount, then most recent', () => {
    const small = pay('2026-10-05', 10)
    const oldBig = pay('2026-10-01', 500)
    const newBig = pay('2026-10-03', 500)
    expect(getLargestExpenses([small, oldBig, newBig], 2)).toEqual([newBig, oldBig])
  })
})

describe('elapsedRange and getAverageDaily', () => {
  it('cuts the range at today', () => {
    expect(elapsedRange(october, '2026-10-08')).toEqual({ start: '2026-10-01', end: '2026-10-08' })
    expect(elapsedRange(october, '2026-11-02')).toEqual(october)
    expect(elapsedRange(october, '2026-09-30')).toBeNull()
  })

  it('averages over elapsed days only', () => {
    const rows = [pay('2026-10-01', 400), pay('2026-10-04', 400)]
    expect(getAverageDaily(rows, october, '2026-10-08')).toBe(100)
    expect(getAverageDaily(rows, october, '2026-12-01')).toBe(Math.round(800 / 31))
    expect(getAverageDaily(rows, october, '2026-09-01')).toBe(0)
  })
})

describe('comparePeriods', () => {
  it('compares like for like days', () => {
    const rows = [
      pay('2026-09-01', 100),
      pay('2026-09-05', 100),
      pay('2026-09-20', 9000), // after the comparable window
      pay('2026-10-02', 300),
    ]
    expect(compareMonths(rows, '2026-10-08', '2026-10-08')).toEqual({
      currentMinor: 300,
      previousMinor: 200,
      change: 0.5,
      days: 8,
    })
  })

  it('compares full months once the month is over', () => {
    const rows = [pay('2026-09-30', 100), pay('2026-10-31', 50)]
    expect(compareMonths(rows, '2026-10-15', '2026-11-03')).toMatchObject({
      currentMinor: 50,
      previousMinor: 100,
      change: -0.5,
      days: 30,
    })
  })

  it('caps at the shorter month', () => {
    // March 31 against all 28 days of February.
    const rows = [pay('2026-02-28', 100), pay('2026-03-31', 100)]
    expect(compareMonths(rows, '2026-03-31', '2026-03-31')).toMatchObject({
      previousMinor: 100,
      days: 28,
    })
  })

  it('has no change when the previous period is empty', () => {
    const week = { start: '2026-10-04', end: '2026-10-10' }
    const prev = { start: '2026-09-27', end: '2026-10-03' }
    expect(comparePeriods([pay('2026-10-05', 10)], week, prev, '2026-10-06')).toMatchObject({
      change: null,
      days: 3,
    })
  })

  it('is null for a future period', () => {
    expect(compareMonths([], '2026-11-01', '2026-10-08')).toBeNull()
  })
})

describe('groupByDay', () => {
  it('groups newest day first with day totals', () => {
    const a = pay('2026-10-01', 100)
    const b = pay('2026-10-03', 20)
    const c = pay('2026-10-03', 30)
    expect(groupByDay([a, b, c])).toEqual([
      { date: '2026-10-03', payments: [c, b], totalMinor: 50 },
      { date: '2026-10-01', payments: [a], totalMinor: 100 },
    ])
  })
})
