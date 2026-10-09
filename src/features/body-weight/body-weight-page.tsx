import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Scale } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { LineTrend } from '@/components/charts'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { SegmentedControl } from '@/components/common/segmented-control'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { useBodyWeights, useWeightUnit } from '@/hooks/use-data'
import { describeChange, loggedWhen } from '@/features/body-weight/body-weight-format'
import { getWeightPoints, pointsSince } from '@/lib/calculations/body-weight'
import { addDaysToKey, parseDayKey, todayKey } from '@/lib/dates'
import { formatRelativeDay, formatWeight } from '@/lib/formatters'

type Span = '30' | '90' | '365' | 'all'

const SPANS: Array<{ value: Span; label: string; phrase: string }> = [
  { value: '30', label: '30D', phrase: 'in 30 days' },
  { value: '90', label: '90D', phrase: 'in 90 days' },
  { value: '365', label: '1Y', phrase: 'in a year' },
  { value: 'all', label: 'All', phrase: 'since you started' },
]

const shortDate = (day: string) => format(parseDayKey(day), 'MMM d')

/** /workouts/body-weight: daily weigh-ins and how they trend. */
export function BodyWeightPage() {
  const entries = useBodyWeights()
  const unit = useWeightUnit()
  const [span, setSpan] = useState<Span>('30')

  const header = (
    <PageHeader
      title="Body weight"
      backTo="/workouts"
      actions={
        <Button variant="ghost" size="icon-lg" aria-label="Log body weight" asChild>
          <Link to="new">
            <Plus className="size-5" aria-hidden />
          </Link>
        </Button>
      }
    />
  )

  if (entries === undefined) {
    return (
      <>
        {header}
        <PageSkeleton />
      </>
    )
  }

  if (entries.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Scale}
          title="No weigh-ins yet"
          description="Log your weight each day. Your trend and progress over time show up here."
          action={
            <Button asChild className="h-11 rounded-full px-5">
              <Link to="new">
                <Plus data-icon="inline-start" aria-hidden />
                Log body weight
              </Link>
            </Button>
          }
        />
        <Outlet />
      </>
    )
  }

  const today = todayKey()
  const points = getWeightPoints(entries, unit)
  const latest = points[points.length - 1]
  const spanInfo = SPANS.find((s) => s.value === span)!
  const shown = pointsSince(
    points,
    span === 'all' ? undefined : addDaysToKey(today, -(Number(span) - 1)),
  )
  const change = describeChange(shown, unit, spanInfo.phrase)
  const pointByDate = new Map(points.map((p) => [p.date, p]))

  return (
    <>
      {header}
      <div className="flex flex-col gap-4">
        <StatCard
          label="Current weight"
          value={formatWeight(latest.weight, unit)}
          detail={`Logged ${loggedWhen(latest.date, today)}. 7-day average ${formatWeight(latest.average, unit)}.`}
        />

        <SectionCard
          title="Progress"
          aside={
            <SegmentedControl<Span>
              aria-label="Time span"
              value={span}
              onValueChange={setSpan}
              options={SPANS}
            />
          }
        >
          <p className="mb-3 text-sm font-medium">
            {change ?? 'Log a few more days to see your trend.'}
          </p>
          {shown.length >= 2 && (
            <>
              <LineTrend
                data={shown.map((p) => ({
                  label: shortDate(p.date),
                  weight: p.weight,
                  average: p.average,
                }))}
                series={[
                  { dataKey: 'weight', color: 'foreground', name: 'Weigh-in', dimmed: true },
                  { dataKey: 'average', color: 'workout', name: '7-day average' },
                ]}
                formatValue={(v) => formatWeight(v, unit)}
                formatTick={(v) => v.toFixed(1)}
                domain={['dataMin - 1', 'dataMax + 1']}
                height={190}
              />
              <ul className="mt-3 flex gap-4 border-t pt-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-workout" aria-hidden />
                  7-day average
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-foreground/35" aria-hidden />
                  Weigh-in
                </li>
              </ul>
            </>
          )}
        </SectionCard>

        <SectionCard title="History" aside={`${entries.length}`}>
          <ul>
            {entries.map((entry, index) => {
              const point = pointByDate.get(entry.date)!
              const before = entries[index + 1] && pointByDate.get(entries[index + 1].date)
              const diff = before ? Math.round((point.weight - before.weight) * 10) / 10 : 0
              return (
                <li key={entry.id}>
                  <Link
                    to={entry.id}
                    className="-mx-2 flex items-baseline justify-between gap-3 rounded-xl px-2 py-2 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {formatRelativeDay(entry.date, today)}
                      </span>
                      {entry.notes && (
                        <span className="block truncate text-sm text-muted-foreground">
                          {entry.notes}
                        </span>
                      )}
                    </span>
                    <span className="tabular shrink-0 text-right">
                      <span className="font-medium">{formatWeight(point.weight, unit)}</span>
                      {before && diff !== 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          {diff > 0 ? '+' : '−'}
                          {Math.abs(diff)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      </div>
      <Outlet />
    </>
  )
}
