import { useMemo, useState } from 'react'
import { useSettings } from '@/hooks/use-data'
import { todayKey, type DayKey } from '@/lib/dates'
import { periodRange } from '@/lib/periods'
import { useAppStore } from '@/stores/app-store'

/**
 * The period selected on a page. Week/month is shared across pages (and
 * persisted); which week or month is being viewed is local to the page.
 */
export function usePeriod() {
  const period = useAppStore((s) => s.period)
  const setPeriod = useAppStore((s) => s.setPeriod)
  const weekStartsOn = useSettings()?.weekStartsOn ?? 0
  const [anchor, setAnchor] = useState<DayKey>(() => todayKey())
  const range = useMemo(
    () => periodRange(period, anchor, weekStartsOn),
    [period, anchor, weekStartsOn],
  )

  return { period, setPeriod, anchor, setAnchor, range, weekStartsOn }
}
