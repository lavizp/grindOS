import { format } from 'date-fns'
import {
  comparePeriods,
  getSpendingByCategory,
  getTotalSpending,
} from '@/lib/calculations/spending'
import {
  addDaysToKey,
  daysBetween,
  isInRange,
  monthRange,
  parseDayKey,
  rangeLength,
} from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { median, percent } from '@/lib/calculations/insights/helpers'
import type { Insight, InsightContext, InsightRule } from '@/lib/calculations/insights/types'

/** Category changes smaller than this aren't worth mentioning. */
export const CATEGORY_CHANGE_MIN = 0.25
/** Payments needed in a category, across both months, before comparing it. */
const CATEGORY_MIN_PAYMENTS = 4
/** Days into the month before comparisons and projections settle down. */
const MONTH_MIN_DAYS = 7
/** Payments needed this month before naming the biggest category. */
const TOP_CATEGORY_MIN_PAYMENTS = 5
/** "Unusually large" means more than this many times the median payment. */
export const LARGE_EXPENSE_FACTOR = 3
const LARGE_EXPENSE_MIN_PAYMENTS = 10
const LARGE_EXPENSE_HISTORY_DAYS = 90
const LARGE_EXPENSE_RECENT_DAYS = 7
/** Within this fraction of last month, the pace counts as "about the same". */
const PACE_TOLERANCE = 0.1

function months({ today }: InsightContext) {
  const month = monthRange(today)
  const previous = monthRange(addDaysToKey(month.start, -1))
  return { month, previous, elapsedDays: daysBetween(month.start, today) + 1 }
}

const monthName = (day: string) => format(parseDayKey(day), 'MMMM')

/** The biggest rise and the biggest fall by category, like-for-like with last month. */
export const categoryChanges: InsightRule = (context) => {
  const { data, today, settings } = context
  const { month, previous, elapsedDays } = months(context)
  if (elapsedDays < MONTH_MIN_DAYS) return []

  const changes = data.categories.flatMap((category) => {
    const payments = data.payments.filter((p) => p.categoryId === category.id)
    const relevant = payments.filter((p) => isInRange(p.date, month) || isInRange(p.date, previous))
    if (relevant.length < CATEGORY_MIN_PAYMENTS) return []
    const comparison = comparePeriods(payments, month, previous, today)
    if (!comparison || comparison.change === null) return []
    if (Math.abs(comparison.change) < CATEGORY_CHANGE_MIN) return []
    return [{ category, ...comparison, change: comparison.change }]
  })

  const up = changes.filter((c) => c.change > 0).sort((a, b) => b.change - a.change)[0]
  const down = changes.filter((c) => c.change < 0).sort((a, b) => a.change - b.change)[0]
  const money = (minor: number) => formatMoney(minor, settings.currency, { whole: true })

  return [up, down].flatMap((c): Insight[] => {
    if (!c) return []
    const rising = c.change > 0
    return [
      {
        id: `spending-category-${rising ? 'up' : 'down'}-${c.category.id}`,
        domain: 'spending',
        severity: rising ? 'warning' : 'positive',
        priority: 55 + Math.min(20, Math.round(Math.abs(c.change) * 20)),
        title: `${c.category.name} spending is ${rising ? 'up' : 'down'} ${percent(c.change)} on last month`,
        detail: `${money(c.currentMinor)} so far this month, against ${money(c.previousMinor)} by this point in ${monthName(previous.start)}.`,
        link: '/spending',
      },
    ]
  })
}

/** Where most of this month's money went. */
export const topCategory: InsightRule = (context) => {
  const { data, settings } = context
  const { month } = months(context)
  const payments = data.payments.filter((p) => isInRange(p.date, month))
  if (payments.length < TOP_CATEGORY_MIN_PAYMENTS) return []
  const [top] = getSpendingByCategory(payments)
  const category = data.categories.find((c) => c.id === top.categoryId)
  if (!category) return []
  return [
    {
      id: `spending-top-category-${category.id}`,
      domain: 'spending',
      severity: 'neutral',
      priority: 30,
      title: `${category.name} is your biggest expense this month`,
      detail: `${formatMoney(top.totalMinor, settings.currency, { whole: true })}, ${percent(top.share)} of what you’ve spent.`,
      link: '/spending',
    },
  ]
}

/** Where this month will land at the current rate, against last month's total. */
export const monthPace: InsightRule = (context) => {
  const { data, settings } = context
  const { month, previous, elapsedDays } = months(context)
  if (elapsedDays < MONTH_MIN_DAYS) return []
  const lastMonthTotal = getTotalSpending(data.payments, previous)
  const soFar = getTotalSpending(data.payments, { start: month.start, end: context.today })
  if (lastMonthTotal === 0 || soFar === 0) return []

  const projected = Math.round((soFar / elapsedDays) * rangeLength(month))
  const change = (projected - lastMonthTotal) / lastMonthTotal
  const money = (minor: number) => formatMoney(minor, settings.currency, { whole: true })
  const last = `${monthName(previous.start)}’s ${money(lastMonthTotal)}`
  const about = Math.abs(change) < PACE_TOLERANCE
  return [
    {
      id: 'spending-month-pace',
      domain: 'spending',
      severity: about ? 'neutral' : change > 0 ? 'warning' : 'positive',
      priority: about ? 35 : 50,
      title: `On pace for ${money(projected)} this month`,
      detail: about
        ? `About the same as ${last}.`
        : `That’s ${percent(change)} ${change > 0 ? 'more' : 'less'} than ${last}.`,
      link: '/spending',
    },
  ]
}

/** The biggest recent payment, if it's far above a typical one. */
export const largeExpense: InsightRule = ({ data, today, settings }) => {
  const history = data.payments.filter(
    (p) => p.date <= today && daysBetween(p.date, today) < LARGE_EXPENSE_HISTORY_DAYS,
  )
  if (history.length < LARGE_EXPENSE_MIN_PAYMENTS) return []
  const typical = median(history.map((p) => p.amountMinor))
  const [largest] = history
    .filter((p) => daysBetween(p.date, today) < LARGE_EXPENSE_RECENT_DAYS)
    .sort((a, b) => b.amountMinor - a.amountMinor)
  if (!largest || largest.amountMinor <= typical * LARGE_EXPENSE_FACTOR) return []

  const category = data.categories.find((c) => c.id === largest.categoryId)
  const where = largest.merchant ?? category?.name
  const money = (minor: number) => formatMoney(minor, settings.currency, { whole: true })
  return [
    {
      id: `spending-large-expense-${largest.id}`,
      domain: 'spending',
      severity: 'neutral',
      priority: 40,
      title: `${money(largest.amountMinor)}${where ? ` on ${where}` : ''} was unusually large`,
      detail: `About ${Math.round(largest.amountMinor / typical)}× your typical payment of ${money(typical)}.`,
      link: `/spending/${largest.id}`,
    },
  ]
}

export const spendingRules: InsightRule[] = [categoryChanges, topCategory, monthPace, largeExpense]
