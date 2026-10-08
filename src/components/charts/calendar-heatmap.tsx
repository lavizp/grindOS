import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  addDaysToKey,
  parseDayKey,
  todayKey,
  weekRange,
  type DayKey,
  type WeekStart,
} from '@/lib/dates'
import { colorVar, type ChartColor } from '@/components/charts/chart-theme'

interface CalendarHeatmapProps {
  /** Value per day; missing days are empty. */
  values: Record<DayKey, number>
  /** Number of weeks to show, ending with the current week. */
  weeks?: number
  weekStartsOn: WeekStart
  color: ChartColor
  today?: DayKey
  /** Accessible description of a day's value, e.g. "1 workout". */
  describe: (value: number) => string
}

/** GitHub-style grid: columns are weeks, rows are weekdays. */
export function CalendarHeatmap({
  values,
  weeks = 12,
  weekStartsOn,
  color,
  today = todayKey(),
  describe,
}: CalendarHeatmapProps) {
  const lastWeekStart = weekRange(today, weekStartsOn).start
  const firstDay = addDaysToKey(lastWeekStart, -7 * (weeks - 1))
  const max = Math.max(1, ...Object.values(values))
  const fill = colorVar(color)

  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDaysToKey(firstDay, w * 7 + d)),
  )
  const weekdayLabels = columns[0].map((day) => format(parseDayKey(day), 'EEEEE'))

  return (
    <div className="flex gap-1.5" role="img" aria-label={`Activity over the last ${weeks} weeks`}>
      <div className="grid grid-rows-7 gap-1 pr-0.5 text-[10px] leading-none text-muted-foreground">
        {weekdayLabels.map((label, i) => (
          <span key={i} className="flex items-center">
            {i % 2 === 1 ? label : ''}
          </span>
        ))}
      </div>
      <div className="grid flex-1 auto-cols-fr grid-flow-col gap-1">
        {columns.map((days) => (
          <div key={days[0]} className="grid grid-rows-7 gap-1">
            {days.map((day) => {
              const value = values[day] ?? 0
              const future = day > today
              return (
                <span
                  key={day}
                  title={
                    future ? undefined : `${format(parseDayKey(day), 'MMM d')}: ${describe(value)}`
                  }
                  className={cn(
                    'aspect-square rounded-[4px]',
                    future ? 'bg-transparent' : 'bg-muted',
                    day === today && 'ring-1 ring-foreground/40',
                  )}
                  style={
                    value > 0
                      ? { background: fill, opacity: 0.35 + 0.65 * (value / max) }
                      : undefined
                  }
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
