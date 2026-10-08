import { Moon } from 'lucide-react'
import { Link } from 'react-router'
import type { Sleep } from '@/db/schema'
import { qualityLevel } from '@/features/sleep/quality'
import { formatSleepWindow } from '@/features/sleep/sleep-format'
import { getDuration } from '@/lib/calculations/sleep'
import { formatDuration, formatNight } from '@/lib/formatters'

interface SleepRowProps {
  entry: Sleep
  /** Replaces the night's name, e.g. "Longest night". */
  title?: string
}

export function SleepRow({ entry, title }: SleepRowProps) {
  const quality = qualityLevel(entry.quality)
  const Icon = quality?.icon ?? Moon
  // A titled row names the night underneath; there's no room for the times as well.
  const details = title
    ? [formatNight(entry.date)]
    : [formatSleepWindow(entry), quality?.label].filter(Boolean)

  return (
    <Link
      to={`/sleep/${entry.id}`}
      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sleep-soft text-sleep">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title ?? formatNight(entry.date)}</span>
        <span className="block truncate text-sm text-muted-foreground">{details.join(', ')}</span>
      </span>
      <span className="tabular shrink-0 font-medium">{formatDuration(getDuration(entry))}</span>
    </Link>
  )
}
