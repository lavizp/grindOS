import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/common/segmented-control'
import { cn } from '@/lib/utils'
import type { DayKey, DayRange, WeekStart } from '@/lib/dates'
import { formatPeriodLabel, isCurrentPeriod, shiftAnchor } from '@/lib/periods'
import type { Span } from '@/stores/app-store'

const SPAN_LABELS: Record<Span, string> = { day: 'Day', week: 'Week', month: 'Month' }

interface PeriodSwitcherProps<T extends Span> {
  period: T
  onPeriodChange: (period: T) => void
  /** Which spans to offer. Defaults to week and month. */
  spans?: readonly T[]
  anchor: DayKey
  onAnchorChange: (anchor: DayKey) => void
  range: DayRange
  weekStartsOn: WeekStart
  className?: string
}

const DEFAULT_SPANS = ['week', 'month'] as const

/** Week/Month (or Day) toggle with previous/next navigation. Never goes into the future. */
export function PeriodSwitcher<T extends Span>({
  period,
  onPeriodChange,
  spans = DEFAULT_SPANS as unknown as readonly T[],
  anchor,
  onAnchorChange,
  range,
  weekStartsOn,
  className,
}: PeriodSwitcherProps<T>) {
  const isCurrent = isCurrentPeriod(range)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <SegmentedControl
        aria-label="Period"
        value={period}
        onValueChange={onPeriodChange}
        options={spans.map((span) => ({ value: span, label: SPAN_LABELS[span] }))}
      />
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
