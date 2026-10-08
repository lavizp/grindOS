import { useMemo, useState } from 'react'
import {
  useCategories,
  useExercises,
  usePayments,
  useSettings,
  useSleepEntries,
  useWorkouts,
} from '@/hooks/use-data'
import { getInsights, INSIGHT_LOOKBACK_DAYS, type Insight } from '@/lib/calculations/insights'
import { lastNDaysRange, todayKey } from '@/lib/dates'

/** Every current insight, most important first. Undefined while loading. */
export function useInsights(): Insight[] | undefined {
  const [today] = useState(() => todayKey())
  const range = useMemo(() => lastNDaysRange(INSIGHT_LOOKBACK_DAYS, today), [today])
  const settings = useSettings()
  const workouts = useWorkouts(range)
  const sleep = useSleepEntries(range)
  const payments = usePayments(range)
  const categories = useCategories({ includeArchived: true })
  const exercises = useExercises({ includeArchived: true })

  return useMemo(() => {
    if (!settings || !workouts || !sleep || !payments || !categories || !exercises) {
      return undefined
    }
    return getInsights({
      today,
      settings,
      data: { workouts, sleep, payments, categories, exercises },
    })
  }, [today, settings, workouts, sleep, payments, categories, exercises])
}
