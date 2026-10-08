import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { DayKey, DayRange, WeekStart } from '@/lib/dates'
import { formatPeriodLabel, isCurrentPeriod, shiftAnchor } from '@/lib/periods'
import type { Period } from '@/stores/app-store'

interface PeriodSwitcherProps {
  period: Period
  onPeriodChange: (period: Period) => void
  anchor: DayKey
  onAnchorChange: (anchor: DayKey) => void
  range: DayRange
  weekStartsOn: WeekStart
  className?: string
}

/** Week/Month toggle with previous/next navigation. Never goes into the future. */
export function PeriodSwitcher({
  period,
  onPeriodChange,
  anchor,
  onAnchorChange,
  range,
  weekStartsOn,
  className,
}: PeriodSwitcherProps) {
  const isCurrent = isCurrentPeriod(range)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Tabs value={period} onValueChange={(value) => onPeriodChange(value as Period)}>
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="ml-auto flex items-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Previous ${period}`}
          onClick={() => onAnchorChange(shiftAnchor(period, anchor, -1))}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <span className="tabular min-w-28 text-center text-sm font-medium" aria-live="polite">
          {formatPeriodLabel(period, range, undefined, weekStartsOn)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Next ${period}`}
          disabled={isCurrent}
          onClick={() => onAnchorChange(shiftAnchor(period, anchor, 1))}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
