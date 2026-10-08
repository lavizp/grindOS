import {
  categoryChanges,
  largeExpense,
  monthPace,
  topCategory,
} from '@/lib/calculations/insights/spending'
import { context, days, pay, plain } from '@/test/insight-fixtures'

// Oct 10: ten days into October, so like-for-like is Sep 1–10.
const today = '2026-10-10'

describe('categoryChanges', () => {
  it('reports the biggest rise and fall, like-for-like', () => {
    const payments = [
      // Food: 600 this month vs 300 by Sep 10 (a Sep 20 payment doesn't count).
      pay('2026-10-02', 30000),
      pay('2026-10-08', 30000),
      pay('2026-09-03', 30000),
      pay('2026-09-20', 90000),
      // Fun: 100 vs 400.
      pay('2026-10-05', 10000, 'fun'),
      pay('2026-09-02', 20000, 'fun'),
      pay('2026-09-04', 10000, 'fun'),
      pay('2026-09-09', 10000, 'fun'),
    ]
    const insights = plain(categoryChanges(context(today, { payments })))
    expect(insights.map((i) => [i.id, i.severity, i.title])).toEqual([
      ['spending-category-up-food', 'warning', 'Food spending is up 100% on last month'],
      ['spending-category-down-fun', 'positive', 'Fun spending is down 75% on last month'],
    ])
    expect(insights[0].detail).toBe(
      'Rs 600 so far this month, against Rs 300 by this point in September.',
    )
  })

  it('ignores small changes, thin categories and the first week of a month', () => {
    const steady = [
      pay('2026-10-02', 10000),
      pay('2026-10-03', 11000),
      pay('2026-09-02', 10000),
      pay('2026-09-03', 10000),
    ]
    expect(categoryChanges(context(today, { payments: steady }))).toEqual([])
    const thin = [pay('2026-10-02', 90000), pay('2026-09-02', 10000)]
    expect(categoryChanges(context(today, { payments: thin }))).toEqual([])
    const early = [...days('2026-10-05', 4).map((d) => pay(d, 50000)), pay('2026-09-01', 100)]
    expect(categoryChanges(context('2026-10-05', { payments: early }))).toEqual([])
  })
})

describe('topCategory', () => {
  it('names the biggest category once there are enough payments', () => {
    const payments = [
      ...days(today, 4).map((d) => pay(d, 30000)),
      pay(today, 40000, 'fun'),
      pay('2026-09-30', 999999, 'fun'), // last month
    ]
    expect(plain(topCategory(context(today, { payments })))).toMatchObject([
      {
        title: 'Food is your biggest expense this month',
        detail: 'Rs 1,200, 75% of what you’ve spent.',
      },
    ])
    expect(topCategory(context(today, { payments: payments.slice(1) }))).toEqual([])
  })
})

describe('monthPace', () => {
  // October has 31 days; Rs 100 a day for 10 days projects to Rs 3,100.
  const thisMonth = days(today, 10).map((d) => pay(d, 10000))

  it('projects the month and compares it with last month', () => {
    const payments = [...thisMonth, pay('2026-09-15', 200000)]
    expect(plain(monthPace(context(today, { payments })))).toMatchObject([
      {
        severity: 'warning',
        title: 'On pace for Rs 3,100 this month',
        detail: 'That’s 55% more than September’s Rs 2,000.',
      },
    ])
  })

  it('calls it about the same within 10%', () => {
    const payments = [...thisMonth, pay('2026-09-15', 300000)]
    expect(plain(monthPace(context(today, { payments })))).toMatchObject([
      { severity: 'neutral', detail: 'About the same as September’s Rs 3,000.' },
    ])
  })

  it('needs last month and a week of this one', () => {
    expect(monthPace(context(today, { payments: thisMonth }))).toEqual([])
    const early = [pay('2026-10-01', 100), pay('2026-09-01', 100)]
    expect(monthPace(context('2026-10-05', { payments: early }))).toEqual([])
  })
})

describe('largeExpense', () => {
  const typical = days(today, 12, 10).map((d) => pay(d, 50000))

  it('flags a recent payment far above the median', () => {
    const big = pay('2026-10-08', 400000, 'fun', 'Daraz')
    expect(plain(largeExpense(context(today, { payments: [...typical, big] })))).toMatchObject([
      {
        id: `spending-large-expense-${big.id}`,
        title: 'Rs 4,000 on Daraz was unusually large',
        detail: 'About 8× your typical payment of Rs 500.',
        link: `/spending/${big.id}`,
      },
    ])
  })

  it('stays quiet below 3× the median, for old payments, or with little history', () => {
    const ok = pay('2026-10-08', 140000)
    expect(largeExpense(context(today, { payments: [...typical, ok] }))).toEqual([])
    const old = pay('2026-09-20', 900000)
    expect(largeExpense(context(today, { payments: [...typical, old] }))).toEqual([])
    const few = [...typical.slice(0, 5), pay('2026-10-08', 900000)]
    expect(largeExpense(context(today, { payments: few }))).toEqual([])
  })
})
