import { format } from 'date-fns'
import { Link } from 'react-router'
import { BarTrend, LineTrend } from '@/components/charts'
import { DomainEmptyState, DomainPage } from '@/components/common/domain-page'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { useSleepEntries, useSleepTarget } from '@/hooks/use-data'
import { usePeriod } from '@/hooks/use-period'
import { qualityLevel } from '@/features/sleep/quality'
import { formatSleepWindow } from '@/features/sleep/sleep-format'
import { SleepRow } from '@/features/sleep/sleep-list'
import {
  fromNightClock,
  getAverageSleep,
  getBestWorstNights,
  getDuration,
  getSleepConsistency,
  getSleepDebt,
  getSleepTrend,
  type SleepConsistency,
} from '@/lib/calculations/sleep'
import {
  addDaysToKey,
  elapsedRange,
  isInRange,
  parseDayKey,
  rangeLength,
  todayKey,
} from '@/lib/dates'
import { formatDuration, formatNight, formatTimeOfDay } from '@/lib/formatters'
import { DOMAINS } from '@/lib/domains'

/** Within this many minutes of the target counts as on target. */
const ON_TARGET_MIN = 5

function describeTarget(averageMin: number, targetMin: number): string {
  const diff = averageMin - targetMin
  const target = formatDuration(targetMin)
  if (Math.abs(diff) < ON_TARGET_MIN) return `Right on your ${target} target`
  return `${formatDuration(Math.abs(diff))} ${diff < 0 ? 'under' : 'over'} your ${target} target`
}

export function SleepPage() {
  const period = usePeriod()
  const { range } = period
  const entries = useSleepEntries(range)
  const targetMin = useSleepTarget()
  const today = todayKey()

  if (entries === undefined) {
    return (
      <DomainPage domain="sleep" period={period}>
        <PageSkeleton />
      </DomainPage>
    )
  }

  const periodName = period.period
  const inProgress = isInRange(today, range)

  if (entries.length === 0) {
    return (
      <DomainPage domain="sleep" period={period}>
        <DomainEmptyState
          domain="sleep"
          title={`No nights logged this ${periodName}`}
          description="Log when you went to bed and woke up. Averages and consistency show up here."
        />
      </DomainPage>
    )
  }

  const lastNight = inProgress ? entries.find((e) => e.date === today) : undefined
  const average = getAverageSleep(entries)!
  const debt = getSleepDebt(entries, targetMin)
  const elapsed = elapsedRange(range, today)
  const possibleNights = elapsed ? rangeLength(elapsed) : rangeLength(range)
  const trend = getSleepTrend(entries, range)
  const consistency = getSleepConsistency(entries)!
  const extremes = getBestWorstNights(entries)!
  // Nights are labeled by the evening they started, matching "Tuesday night" in the list.
  const dayLabel = periodName === 'week' ? 'EEE' : 'd'

  return (
    <DomainPage domain="sleep" period={period}>
      <div className="flex flex-col gap-4">
        {inProgress &&
          (lastNight ? (
            <StatCard
              domain="sleep"
              label="Last night"
              value={formatDuration(getDuration(lastNight))}
              detail={[formatSleepWindow(lastNight), qualityLevel(lastNight.quality)?.label]
                .filter(Boolean)
                .join(', ')}
            />
          ) : (
            <section className="flex items-center justify-between gap-3 rounded-2xl bg-sleep-soft p-4">
              <p className="font-medium">Last night isn’t logged yet</p>
              <Button
                asChild
                className="h-10 rounded-full bg-sleep px-4 text-on-accent hover:bg-sleep/90"
              >
                <Link to={DOMAINS.sleep.newPath}>{DOMAINS.sleep.addLabel}</Link>
              </Button>
            </section>
          ))}

        <StatCard
          domain="sleep"
          label={inProgress ? `Average this ${periodName}` : 'Average'}
          value={formatDuration(average)}
          detail={describeTarget(average, targetMin)}
        >
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Nights logged</dt>
              <dd className="tabular mt-0.5 font-medium">
                {entries.length} of {possibleNights}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sleep debt</dt>
              <dd className="tabular mt-0.5 font-medium">
                {debt.netMin > 0 ? formatDuration(debt.netMin) : 'None'}
              </dd>
            </div>
          </dl>
        </StatCard>

        <SectionCard
          title={periodName === 'week' ? 'Each night' : 'Night by night'}
          aside={`Target ${formatDuration(targetMin)}`}
        >
          <BarTrend
            data={trend.map((n) => ({
              key: n.date,
              label: format(parseDayKey(addDaysToKey(n.date, -1)), dayLabel),
              value: n.durationMin ?? 0,
            }))}
            color="sleep"
            formatValue={(v) => (v > 0 ? formatDuration(v) : 'Not logged')}
            formatKey={(key) => formatNight(key)}
            target={targetMin}
            height={160}
          />
        </SectionCard>

        {entries.length >= 2 && (
          <SectionCard title="Bedtime and wake time">
            <LineTrend
              data={trend.map((n) => ({
                label: format(parseDayKey(addDaysToKey(n.date, -1)), dayLabel),
                bedtime: n.bedtime,
                wakeTime: n.wakeTime,
              }))}
              series={[
                { dataKey: 'bedtime', color: 'sleep', name: 'Bedtime' },
                { dataKey: 'wakeTime', color: 'foreground', name: 'Woke up' },
              ]}
              formatValue={(v) => formatTimeOfDay(fromNightClock(v))}
              domain={['dataMin - 45', 'dataMax + 45']}
              reversed
              showYAxis={false}
              height={150}
            />
            <ConsistencyLegend consistency={consistency} />
          </SectionCard>
        )}

        {entries.length >= 3 && (
          <SectionCard title="Longest and shortest">
            <ul>
              <li>
                <SleepRow entry={extremes.best} title="Longest night" />
              </li>
              <li>
                <SleepRow entry={extremes.worst} title="Shortest night" />
              </li>
            </ul>
          </SectionCard>
        )}

        <SectionCard
          title="Nights"
          aside={entries.length === 1 ? '1 night' : `${entries.length} nights`}
        >
          <ul>
            {entries.map((entry) => (
              <li key={entry.id}>
                <SleepRow entry={entry} />
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </DomainPage>
  )
}

/** Doubles as the chart's legend: usual times and how much they vary. */
function ConsistencyLegend({ consistency }: { consistency: SleepConsistency }) {
  const rows = [
    {
      label: 'Usual bedtime',
      swatch: 'bg-sleep',
      time: consistency.bedtime,
      spread: consistency.bedtimeSpread,
    },
    {
      label: 'Usual wake time',
      swatch: 'bg-foreground',
      time: consistency.wakeTime,
      spread: consistency.wakeSpread,
    },
  ]
  return (
    <dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <span className={`size-2 rounded-full ${row.swatch}`} aria-hidden />
            {row.label}
          </dt>
          <dd className="mt-0.5">
            <span className="tabular font-medium">{formatTimeOfDay(row.time)}</span>
            {Math.round(row.spread) > 0 && (
              <span className="text-muted-foreground">
                , give or take {formatDuration(row.spread)}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
