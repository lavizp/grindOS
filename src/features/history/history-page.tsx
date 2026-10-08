import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { PeriodSwitcher } from '@/components/common/period-switcher'
import { Button } from '@/components/ui/button'
import type { Category, Exercise, ID } from '@/db/schema'
import {
  useCategories,
  useCurrency,
  useExercises,
  usePayments,
  useSettings,
  useSleepEntries,
  useWorkouts,
} from '@/hooks/use-data'
import { CategoryIcon } from '@/features/spending/category-icon'
import { PaymentRow } from '@/features/spending/payment-list'
import { SleepRow } from '@/features/sleep/sleep-list'
import { WorkoutRow } from '@/features/workouts/workout-list'
import { buildTimeline, type TimelineDay, type TimelineItem } from '@/features/history/timeline'
import { todayKey, type DayKey } from '@/lib/dates'
import { formatRelativeDay } from '@/lib/formatters'
import { formatMoney } from '@/lib/money'
import { periodRange } from '@/lib/periods'
import { cn } from '@/lib/utils'
import { ALL_ENTRY_TYPES, useAppStore, type EntryType, type Span } from '@/stores/app-store'

const SPANS = ['day', 'week', 'month'] as const

const TYPE_LABELS: Record<EntryType, string> = {
  workout: 'Workouts',
  sleep: 'Sleep',
  payment: 'Payments',
}

const SPAN_NAMES: Record<Span, string> = { day: 'day', week: 'week', month: 'month' }

const chip =
  'touch-target relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-[color,background-color,scale] outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]'
const chipIdle = 'border-border bg-card text-foreground hover:bg-muted'
const chipActive = 'border-transparent bg-foreground text-background'

export function HistoryPage() {
  const filters = useAppStore((s) => s.historyFilters)
  const setSpan = useAppStore((s) => s.setHistorySpan)
  const toggleType = useAppStore((s) => s.toggleHistoryType)
  const setCategory = useAppStore((s) => s.setHistoryCategory)
  const resetFilters = useAppStore((s) => s.resetHistoryFilters)
  const weekStartsOn = useSettings()?.weekStartsOn ?? 0
  const [anchor, setAnchor] = useState<DayKey>(() => todayKey())
  const range = useMemo(
    () => periodRange(filters.span, anchor, weekStartsOn),
    [filters.span, anchor, weekStartsOn],
  )

  const workouts = useWorkouts(range)
  const sleep = useSleepEntries(range)
  const payments = usePayments(range)
  const exerciseList = useExercises({ includeArchived: true })
  const categoryList = useCategories({ includeArchived: true })
  const currency = useCurrency()

  const loading =
    workouts === undefined ||
    sleep === undefined ||
    payments === undefined ||
    exerciseList === undefined ||
    categoryList === undefined

  const filtered = filters.types.length !== ALL_ENTRY_TYPES.length || filters.categoryId !== null
  const showsPayments = filters.types.includes('payment')

  return (
    <>
      <PageHeader title="History" backTo="/" />
      <PeriodSwitcher
        period={filters.span}
        onPeriodChange={setSpan}
        spans={SPANS}
        anchor={anchor}
        onAnchorChange={setAnchor}
        range={range}
        weekStartsOn={weekStartsOn}
        className="mb-3"
      />

      <div role="group" aria-label="Show" className="flex flex-wrap items-center gap-2">
        {ALL_ENTRY_TYPES.map((type) => {
          const on = filters.types.includes(type)
          return (
            <button
              key={type}
              type="button"
              aria-pressed={on}
              onClick={() => toggleType(type)}
              className={cn(chip, on ? chipActive : chipIdle)}
            >
              {TYPE_LABELS[type]}
            </button>
          )
        })}
      </div>

      {showsPayments && categoryList && categoryList.length > 0 && (
        <div
          role="group"
          aria-label="Payment category"
          className="-mx-4 mt-2 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
        >
          <button
            type="button"
            aria-pressed={filters.categoryId === null}
            onClick={() => setCategory(null)}
            className={cn(chip, filters.categoryId === null ? chipActive : chipIdle)}
          >
            All categories
          </button>
          {categoryList
            .filter((c) => !c.archived || c.id === filters.categoryId)
            .map((category) => {
              const on = filters.categoryId === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategory(on ? null : category.id)}
                  className={cn(chip, 'pl-1.5', on ? chipActive : chipIdle)}
                >
                  <CategoryIcon icon={category.icon} color={category.color} size="xs" />
                  {category.name}
                </button>
              )
            })}
        </div>
      )}

      {filtered && (
        <p className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          Some entries are hidden by filters.
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="-mr-2 text-foreground"
          >
            Show everything
          </Button>
        </p>
      )}

      <div className="mt-4">
        {loading ? (
          <PageSkeleton />
        ) : (
          <Timeline
            days={buildTimeline({ workouts, sleep, payments }, filters)}
            exercises={new Map(exerciseList.map((e) => [e.id, e]))}
            categories={new Map(categoryList.map((c) => [c.id, c]))}
            currency={currency}
            emptyTitle={
              filtered
                ? 'Nothing matches these filters'
                : `Nothing logged this ${SPAN_NAMES[filters.span]}`
            }
          />
        )}
      </div>
    </>
  )
}

interface TimelineProps {
  days: TimelineDay[]
  exercises: Map<ID, Exercise>
  categories: Map<ID, Category>
  currency: string
  emptyTitle: string
}

function Timeline({ days, exercises, categories, currency, emptyTitle }: TimelineProps) {
  if (days.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={emptyTitle}
        description="Every workout, night and payment you log appears here by day."
      />
    )
  }

  function row(item: TimelineItem) {
    switch (item.type) {
      case 'workout':
        return <WorkoutRow workout={item.workout} exercises={exercises} showDate={false} />
      case 'sleep':
        return <SleepRow entry={item.sleep} />
      case 'payment':
        return (
          <PaymentRow
            payment={item.payment}
            category={categories.get(item.payment.categoryId)}
            currency={currency}
          />
        )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <section
          key={day.date}
          aria-labelledby={`history-${day.date}`}
          className="rounded-2xl bg-card p-4 text-card-foreground"
        >
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h2 id={`history-${day.date}`} className="font-sans text-base font-semibold">
              {formatRelativeDay(day.date)}
            </h2>
            {day.spentMinor > 0 && (
              <span className="tabular text-sm text-muted-foreground">
                {formatMoney(day.spentMinor, currency)} spent
              </span>
            )}
          </div>
          <ul>
            {day.items.map((item) => (
              <li key={`${item.type}-${item.id}`}>{row(item)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
