import { useMemo, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { ChevronRight, CloudUpload, History, Settings, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { Button } from '@/components/ui/button'
import type { Category, Payment, Sleep, Workout } from '@/db/schema'
import {
  useCategories,
  useCurrency,
  useFirstLoggedDay,
  usePayments,
  useSettings,
  useSleepEntries,
  useWorkouts,
} from '@/hooks/use-data'
import { InstallHint } from '@/features/dashboard/install-hint'
import { Welcome } from '@/features/dashboard/welcome'
import { InsightList } from '@/features/insights/insight-list'
import { useInsights } from '@/features/insights/use-insights'
import { qualityLevel } from '@/features/sleep/quality'
import {
  daysSinceBackup,
  getTypicalDailySpending,
  getUsualWeeklyWorkouts,
  needsBackup,
  TYPICAL_SPENDING_DAYS,
  USUAL_WEEKS,
} from '@/lib/calculations/dashboard'
import { getAverageSleep, getDuration } from '@/lib/calculations/sleep'
import {
  comparePeriods,
  getDailySpending,
  getTopCategories,
  getTotalSpending,
} from '@/lib/calculations/spending'
import {
  addDaysToKey,
  isInRange,
  monthRange,
  parseDayKey,
  previousRange,
  todayKey,
  weekRange,
  type DayKey,
  type DayRange,
  type WeekStart,
} from '@/lib/dates'
import { DOMAIN_ORDER, DOMAINS, type Domain } from '@/lib/domains'
import { formatDuration } from '@/lib/formatters'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

function greeting(hour: number): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const minDay = (...days: DayKey[]) => days.reduce((a, b) => (a < b ? a : b))

interface Ranges {
  week: DayRange
  previousWeek: DayRange
  month: DayRange
  workouts: DayRange
  sleep: DayRange
  payments: DayRange
}

function dashboardRanges(today: DayKey, weekStartsOn: WeekStart): Ranges {
  const week = weekRange(today, weekStartsOn)
  const previousWeek = previousRange(week)
  const month = monthRange(today)
  return {
    week,
    previousWeek,
    month,
    workouts: { start: addDaysToKey(week.start, -7 * USUAL_WEEKS), end: today },
    sleep: { start: week.start, end: today },
    payments: {
      start: minDay(month.start, previousWeek.start, addDaysToKey(today, -TYPICAL_SPENDING_DAYS)),
      end: today,
    },
  }
}

export function DashboardPage() {
  const [now] = useState(() => new Date())
  const today = todayKey(now)
  const settings = useSettings()
  const weekStartsOn = settings?.weekStartsOn ?? 0
  const ranges = useMemo(() => dashboardRanges(today, weekStartsOn), [today, weekStartsOn])

  const workouts = useWorkouts(ranges.workouts)
  const sleep = useSleepEntries(ranges.sleep)
  const payments = usePayments(ranges.payments)
  const categories = useCategories({ includeArchived: true })
  const firstLoggedDay = useFirstLoggedDay()
  const currency = useCurrency()

  const loading =
    settings === undefined ||
    workouts === undefined ||
    sleep === undefined ||
    payments === undefined ||
    categories === undefined ||
    firstLoggedDay === undefined

  // A fresh install starts with a welcome. Anyone with data already skips it.
  if (settings && settings.onboardedAt === undefined && firstLoggedDay === null) {
    return <Welcome settings={settings} />
  }

  return (
    <>
      <PageHeader
        subtitle={format(now, 'EEEE, MMMM d')}
        title={greeting(now.getHours())}
        actions={
          <>
            <Button asChild variant="ghost" size="icon-lg" aria-label="History">
              <Link to="/history">
                <History className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-lg" aria-label="Insights">
              <Link to="/insights">
                <Sparkles className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-lg" aria-label="Settings">
              <Link to="/settings">
                <Settings className="size-5" aria-hidden />
              </Link>
            </Button>
          </>
        }
      />

      <QuickActions />

      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <InstallHint />
          {needsBackup(settings.lastBackupAt, firstLoggedDay, now) && (
            <BackupNudge days={daysSinceBackup(settings.lastBackupAt, now)} />
          )}
          <TodayCard
            today={today}
            workouts={workouts}
            sleep={sleep}
            payments={payments}
            currency={currency}
          />
          <InsightsCard />
          <WeekCard
            today={today}
            ranges={ranges}
            weekStartsOn={weekStartsOn}
            workouts={workouts}
            sleep={sleep}
            payments={payments}
            currency={currency}
          />
          <MonthCard
            today={today}
            month={ranges.month}
            payments={payments}
            categories={categories}
            currency={currency}
          />
        </div>
      )}
    </>
  )
}

function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-3 gap-2">
      {DOMAIN_ORDER.map((domain) => {
        const config = DOMAINS[domain]
        const Icon = config.icon
        return (
          <Link
            key={domain}
            to={config.newPath}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-card px-2 py-3 text-sm font-medium outline-none hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
          >
            <span className={cn('grid size-9 place-items-center rounded-xl', config.softBg)}>
              <Icon className={cn('size-5', config.text)} aria-hidden />
            </span>
            {config.addLabel}
          </Link>
        )
      })}
    </nav>
  )
}

interface TodayRowProps {
  domain: Domain
  to: string
  value: ReactNode
  detail: ReactNode
  done: boolean
}

function TodayRow({ domain, to, value, detail, done }: TodayRowProps) {
  const config = DOMAINS[domain]
  const Icon = config.icon
  return (
    <li>
      <Link
        to={to}
        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
      >
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', config.softBg)}>
          <Icon className={cn('size-5', config.text)} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-muted-foreground">{config.label}</span>
          <span className={cn('block truncate font-medium', !done && 'text-muted-foreground')}>
            {value}
          </span>
          {detail && <span className="block text-sm text-muted-foreground">{detail}</span>}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  )
}

interface TodayCardProps {
  today: DayKey
  workouts: Workout[]
  sleep: Sleep[]
  payments: Payment[]
  currency: string
}

function TodayCard({ today, workouts, sleep, payments, currency }: TodayCardProps) {
  const todays = workouts.filter((w) => w.date === today)
  const lastNight = sleep.find((s) => s.date === today)
  const spent = getTotalSpending(payments, { start: today, end: today })
  const typical = getTypicalDailySpending(payments, today)
  const quality = qualityLevel(lastNight?.quality)
  const minutes = todays.reduce((sum, w) => sum + (w.durationMin ?? 0), 0)

  let spendingDetail: ReactNode = null
  // Comparing an empty day with a usual one says nothing useful.
  if (typical !== null && spent > 0) {
    const diff = spent - typical
    const amount = formatMoney(Math.abs(diff), currency, { whole: true })
    spendingDetail =
      Math.abs(diff) < typical * 0.05
        ? 'About a usual day'
        : `${amount} ${diff < 0 ? 'under' : 'over'} a usual day`
  }

  return (
    <SectionCard title="Today">
      <ul>
        <TodayRow
          domain="workout"
          to={todays.length > 0 ? `/workouts/${todays[0].id}` : DOMAINS.workout.newPath}
          done={todays.length > 0}
          value={todays.length > 0 ? todays.map((w) => w.name).join(' and ') : 'Not yet'}
          detail={minutes > 0 ? formatDuration(minutes) : null}
        />
        <TodayRow
          domain="sleep"
          to={lastNight ? `/sleep/${lastNight.id}` : DOMAINS.sleep.newPath}
          done={!!lastNight}
          value={lastNight ? formatDuration(getDuration(lastNight)) : 'Last night isn’t logged'}
          detail={
            quality && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-sleep"
                  style={{ opacity: 0.25 + quality.value * 0.15 }}
                />
                {quality.label}
              </span>
            )
          }
        />
        <TodayRow
          domain="spending"
          to="/spending"
          done={spent > 0}
          value={spent > 0 ? formatMoney(spent, currency) : 'Nothing spent'}
          detail={spendingDetail}
        />
      </ul>
    </SectionCard>
  )
}

interface WeekCardProps {
  today: DayKey
  ranges: Ranges
  weekStartsOn: WeekStart
  workouts: Workout[]
  sleep: Sleep[]
  payments: Payment[]
  currency: string
}

function WeekCard({
  today,
  ranges,
  weekStartsOn,
  workouts,
  sleep,
  payments,
  currency,
}: WeekCardProps) {
  const count = workouts.filter((w) => isInRange(w.date, ranges.week)).length
  const usual = getUsualWeeklyWorkouts(workouts, today, weekStartsOn)
  const averageSleep = getAverageSleep(sleep, ranges.week)
  const nights = sleep.filter((s) => isInRange(s.date, ranges.week)).length
  const spent = getTotalSpending(payments, ranges.week)
  const comparison = comparePeriods(payments, ranges.week, ranges.previousWeek, today)
  const change = comparison?.change ?? null

  return (
    <SectionCard title="This week">
      <dl className="grid grid-cols-3 gap-3">
        <WeekStat
          label="Workouts"
          value={count}
          detail={usual === null ? 'So far' : `Usually ${usual}`}
        />
        <WeekStat
          label="Sleep"
          value={averageSleep === null ? 'None' : formatDuration(averageSleep)}
          detail={
            averageSleep === null
              ? 'No nights'
              : `Average of ${nights} ${nights === 1 ? 'night' : 'nights'}`
          }
        />
        <WeekStat
          label="Spent"
          value={formatMoney(spent, currency, { compact: true })}
          detail={
            change === null
              ? 'So far'
              : Math.round(change * 100) === 0
                ? 'Same as last week'
                : `${Math.round(Math.abs(change) * 100)}% ${change < 0 ? 'less' : 'more'} than last week`
          }
        />
      </dl>
    </SectionCard>
  )
}

function WeekStat({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="tabular mt-1 truncate font-heading text-xl font-semibold">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted-foreground">{detail}</dd>
    </div>
  )
}

interface MonthCardProps {
  today: DayKey
  month: DayRange
  payments: Payment[]
  categories: Category[]
  currency: string
}

function MonthCard({ today, month, payments, categories, currency }: MonthCardProps) {
  const total = getTotalSpending(payments, month)
  const [top] = getTopCategories(payments, 1, month)
  const topName = top && categories.find((c) => c.id === top.categoryId)?.name
  const elapsed = { start: month.start, end: today }
  const daily = getDailySpending(payments, elapsed)
  const peak = Math.max(1, ...daily.map((d) => d.totalMinor))

  return (
    <Link
      to="/spending"
      className="block rounded-2xl bg-card p-4 text-card-foreground outline-none hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-sans text-base font-semibold">
          {format(parseDayKey(month.start), 'MMMM')} spending
        </h2>
        <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden />
      </div>
      <p className="tabular mt-2 font-heading text-display font-semibold">
        {formatMoney(total, currency)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {total === 0
          ? 'Nothing spent this month yet'
          : topName
            ? `Mostly ${topName}, ${Math.round(top.share * 100)}%`
            : null}
      </p>
      {total > 0 && (
        // A sparkline: one bar per day so far, for shape rather than numbers.
        <div aria-hidden className="mt-4 flex h-12 items-end gap-[3px]">
          {daily.map((d) => (
            <span
              key={d.date}
              className={cn(
                'min-h-[3px] flex-1 rounded-t-[3px]',
                d.date === today ? 'bg-spending' : 'bg-spending/45',
              )}
              style={{ height: `${(d.totalMinor / peak) * 100}%` }}
            />
          ))}
        </div>
      )}
    </Link>
  )
}

/** Top few insights, by priority. Hidden until there are any. */
const DASHBOARD_INSIGHTS = 3

function InsightsCard() {
  const insights = useInsights()
  if (!insights || insights.length === 0) return null
  return (
    <SectionCard
      title="Insights"
      aside={
        <Link
          to="/insights"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          See all {insights.length}
        </Link>
      }
    >
      <InsightList insights={insights.slice(0, DASHBOARD_INSIGHTS)} />
    </SectionCard>
  )
}

function BackupNudge({ days }: { days: number | null }) {
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-dashed p-4">
      <CloudUpload className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">
        {days === null ? 'You haven’t backed up yet.' : `Last backup was ${days} days ago.`}{' '}
        <span className="text-muted-foreground">Your data lives only on this device.</span>
      </p>
      <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full">
        <Link to="/settings">Back up</Link>
      </Button>
    </section>
  )
}
