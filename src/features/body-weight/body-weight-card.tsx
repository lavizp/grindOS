import { ChevronRight, Scale } from 'lucide-react'
import { Link } from 'react-router'
import { useBodyWeights, useWeightUnit } from '@/hooks/use-data'
import { getWeightPoints, pointsSince } from '@/lib/calculations/body-weight'
import { addDaysToKey, todayKey } from '@/lib/dates'
import { formatWeight } from '@/lib/formatters'
import { describeChange, loggedWhen } from '@/features/body-weight/body-weight-format'

/** On the Workouts page: the latest weigh-in and the last 30 days' change. */
export function BodyWeightCard() {
  const entries = useBodyWeights()
  const unit = useWeightUnit()
  if (entries === undefined) return null

  const today = todayKey()
  const points = getWeightPoints(entries, unit)
  const latest = points.at(-1)
  const change = describeChange(pointsSince(points, addDaysToKey(today, -29)), unit, 'in 30 days')

  return (
    <Link
      to="/workouts/body-weight"
      className="flex items-center gap-3 rounded-2xl bg-card p-4 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-workout-soft">
        <Scale className="size-5 text-workout" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Body weight</span>
        <span className="block truncate text-sm text-muted-foreground">
          {latest
            ? `${formatWeight(latest.weight, unit)}, logged ${loggedWhen(latest.date, today)}`
            : 'Log your weight to track it over time'}
        </span>
        {change && <span className="block truncate text-sm text-muted-foreground">{change}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  )
}
