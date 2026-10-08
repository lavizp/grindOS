import { useMemo } from 'react'
import { addMonths, format } from 'date-fns'
import { BarTrend } from '@/components/charts'
import { DomainEmptyState, DomainPage } from '@/components/common/domain-page'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { StatCard } from '@/components/common/stat-card'
import { useCategories, useCurrency, usePayments } from '@/hooks/use-data'
import { usePeriod } from '@/hooks/use-period'
import { CategoryBreakdown } from '@/features/spending/category-breakdown'
import { PaymentDayList, PaymentRow } from '@/features/spending/payment-list'
import {
  comparePeriods,
  getAverageDaily,
  getDailySpending,
  getLargestExpenses,
  getMonthlySpending,
  getSpendingByCategory,
  getTotalSpending,
  type PeriodComparison,
} from '@/lib/calculations/spending'
import {
  addDaysToKey,
  isInRange,
  monthRange,
  parseDayKey,
  previousRange,
  todayKey,
  type DayRange,
} from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { Period } from '@/stores/app-store'

const MONTHS_SHOWN = 6

function previousPeriod(period: Period, range: DayRange): DayRange {
  return period === 'week' ? previousRange(range) : monthRange(addDaysToKey(range.start, -1))
}

function describeChange(
  comparison: PeriodComparison | null,
  period: Period,
  inProgress: boolean,
): string | undefined {
  if (!comparison || comparison.change === null) return undefined
  const against = inProgress
    ? `this point last ${period}`
    : period === 'week'
      ? 'the week before'
      : 'the month before'
  const percent = Math.round(Math.abs(comparison.change) * 100)
  if (percent === 0) return `About the same as ${against}`
  return `${percent}% ${comparison.change > 0 ? 'more' : 'less'} than ${against}`
}

export function SpendingPage() {
  const period = usePeriod()
  const { range } = period
  const currency = useCurrency()
  const categoryList = useCategories({ includeArchived: true })
  const today = todayKey()

  const previous = previousPeriod(period.period, range)
  // One query covers the period, the previous period and the monthly trend.
  const queryRange = useMemo(() => {
    const monthsStart = monthRange(
      format(addMonths(parseDayKey(range.end), -(MONTHS_SHOWN - 1)), 'yyyy-MM-dd'),
    ).start
    return { start: monthsStart < previous.start ? monthsStart : previous.start, end: range.end }
  }, [range.end, previous.start])
  const allPayments = usePayments(queryRange)

  if (allPayments === undefined || categoryList === undefined) {
    return (
      <DomainPage domain="spending" period={period}>
        <PageSkeleton />
      </DomainPage>
    )
  }

  const categories = new Map(categoryList.map((c) => [c.id, c]))
  const payments = allPayments.filter((p) => isInRange(p.date, range))
  const inProgress = isInRange(today, range)
  const periodName = period.period

  if (payments.length === 0) {
    return (
      <DomainPage domain="spending" period={period}>
        <DomainEmptyState
          domain="spending"
          title={inProgress ? `Nothing spent this ${periodName}` : `No payments this ${periodName}`}
          description="Add payments as you go. Totals, categories and trends show up here."
        />
      </DomainPage>
    )
  }

  const total = getTotalSpending(payments)
  const comparison = comparePeriods(allPayments, range, previous, today)
  const averageDaily = getAverageDaily(payments, range, today)
  const daily = getDailySpending(payments, range)
  const byCategory = getSpendingByCategory(payments)
  const largest = getLargestExpenses(payments, 3)
  const monthly = getMonthlySpending(allPayments, range.end, MONTHS_SHOWN)
  const money = (minor: number) => formatMoney(minor, currency)
  const compactMoney = (minor: number) => formatMoney(minor, currency, { compact: true })

  return (
    <DomainPage domain="spending" period={period}>
      <div className="flex flex-col gap-4">
        <StatCard
          domain="spending"
          label={inProgress ? `Spent this ${periodName}` : `Spent`}
          value={money(total)}
          detail={describeChange(comparison, periodName, inProgress)}
        >
          <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
            <span className="tabular font-medium text-foreground">
              {formatMoney(averageDaily, currency, { whole: true })}
            </span>{' '}
            a day on average
          </p>
        </StatCard>

        <SectionCard title={periodName === 'week' ? 'Each day' : 'Day by day'}>
          <BarTrend
            data={daily.map((d) => ({
              key: d.date,
              label: format(parseDayKey(d.date), periodName === 'week' ? 'EEE' : 'd'),
              value: d.totalMinor,
            }))}
            color="spending"
            formatValue={money}
            formatKey={(key) => format(parseDayKey(key), 'EEE, MMM d')}
            height={160}
          />
        </SectionCard>

        <SectionCard title="Where it went">
          <CategoryBreakdown
            totals={byCategory}
            categories={categories}
            totalMinor={total}
            currency={currency}
          />
        </SectionCard>

        {payments.length > largest.length && (
          <SectionCard title="Largest payments">
            <ul>
              {largest.map((payment) => (
                <li key={payment.id}>
                  <PaymentRow
                    payment={payment}
                    category={categories.get(payment.categoryId)}
                    currency={currency}
                    showDate
                  />
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        <SectionCard title="By month" aside={`Last ${MONTHS_SHOWN} months`}>
          <BarTrend
            data={monthly.map((m) => ({
              key: m.month,
              label: format(parseDayKey(`${m.month}-01`), 'MMM'),
              value: m.totalMinor,
            }))}
            color="spending"
            formatValue={compactMoney}
            formatKey={(key) => format(parseDayKey(`${key}-01`), 'MMMM yyyy')}
            highlightKey={range.end.slice(0, 7)}
            height={140}
          />
        </SectionCard>

        <SectionCard
          title="Payments"
          aside={payments.length === 1 ? '1 payment' : `${payments.length} payments`}
        >
          <PaymentDayList payments={payments} categories={categories} currency={currency} />
        </SectionCard>
      </div>
    </DomainPage>
  )
}
