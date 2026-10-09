import { useMemo } from 'react'
import { CalendarHeatmap } from '@/components/charts'
import { DomainEmptyState, DomainPage } from '@/components/common/domain-page'
import { EmptyState } from '@/components/common/empty-state'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { StatCard } from '@/components/common/stat-card'
import { useExercises, useWeightUnit, useWorkouts } from '@/hooks/use-data'
import { usePeriod } from '@/hooks/use-period'
import { BodyWeightCard } from '@/features/body-weight/body-weight-card'
import { ExerciseLink, WorkoutRow } from '@/features/workouts/workout-list'
import {
  getDailyCounts,
  getStreak,
  getTopExercises,
  getVolume,
  getWorkoutFrequency,
} from '@/lib/calculations/workouts'
import { addDaysToKey, isInRange, todayKey } from '@/lib/dates'
import { formatDuration, formatWeight } from '@/lib/formatters'

const HEATMAP_WEEKS = 12
/** How far back the streak looks. */
const STREAK_LOOKBACK_DAYS = 365

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

export function WorkoutsPage() {
  const period = usePeriod()
  const { range, weekStartsOn } = period
  const today = todayKey()
  const unit = useWeightUnit()
  const exerciseList = useExercises({ includeArchived: true })

  // One query covers the period, the heatmap and the streak.
  const queryRange = useMemo(() => {
    const lookback = addDaysToKey(today, -STREAK_LOOKBACK_DAYS)
    return {
      start: range.start < lookback ? range.start : lookback,
      end: range.end > today ? range.end : today,
    }
  }, [range.start, range.end, today])
  const allWorkouts = useWorkouts(queryRange)

  if (allWorkouts === undefined || exerciseList === undefined) {
    return (
      <DomainPage domain="workout" period={period}>
        <PageSkeleton />
      </DomainPage>
    )
  }

  const periodName = period.period
  if (allWorkouts.length === 0) {
    return (
      <DomainPage domain="workout" period={period}>
        <div className="flex flex-col gap-4">
          <DomainEmptyState
            domain="workout"
            title="No workouts yet"
            description="Log your sets and reps. Streaks, progress and records show up here."
          />
          <BodyWeightCard />
        </div>
      </DomainPage>
    )
  }

  const exercises = new Map(exerciseList.map((e) => [e.id, e]))
  const workouts = allWorkouts.filter((w) => isInRange(w.date, range))
  const inProgress = isInRange(today, range)
  const frequency = getWorkoutFrequency(workouts)
  const streak = getStreak(allWorkouts, today, weekStartsOn)
  const volume = getVolume(workouts, unit)
  const top = getTopExercises(workouts, 5)

  return (
    <DomainPage domain="workout" period={period}>
      <div className="flex flex-col gap-4">
        <StatCard
          domain="workout"
          label={inProgress ? `Workouts this ${periodName}` : 'Workouts'}
          value={frequency.workouts}
          detail={
            streak > 0 ? `${streak}-week streak` : 'Log a workout this week to start a streak'
          }
        >
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="tabular mt-0.5 font-medium">
                {frequency.totalMinutes > 0 ? formatDuration(frequency.totalMinutes) : 'Not logged'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Volume</dt>
              <dd className="tabular mt-0.5 font-medium">
                {volume > 0 ? formatWeight(Math.round(volume), unit) : 'None'}
              </dd>
            </div>
          </dl>
        </StatCard>

        <BodyWeightCard />

        <SectionCard title={`Last ${HEATMAP_WEEKS} weeks`}>
          <CalendarHeatmap
            values={getDailyCounts(allWorkouts)}
            weeks={HEATMAP_WEEKS}
            weekStartsOn={weekStartsOn}
            color="workout"
            today={today}
            describe={(count) => (count === 0 ? 'Rest day' : plural(count, 'workout'))}
          />
        </SectionCard>

        {workouts.length === 0 ? (
          <EmptyState
            domain="workout"
            title={`No workouts this ${periodName}`}
            description="Pick another week or month, or log one now."
          />
        ) : (
          <>
            <SectionCard title="Workouts" aside={plural(workouts.length, 'workout')}>
              <ul>
                {workouts.map((workout) => (
                  <li key={workout.id}>
                    <WorkoutRow workout={workout} exercises={exercises} />
                  </li>
                ))}
              </ul>
            </SectionCard>

            {top.length > 0 && (
              <SectionCard title="Most frequent exercises">
                <ul>
                  {top.map((usage) => (
                    <li key={usage.exerciseId}>
                      <ExerciseLink
                        exerciseId={usage.exerciseId}
                        exercise={exercises.get(usage.exerciseId)}
                        detail={`${plural(usage.sessions, 'session')}, ${plural(usage.sets, 'set')}`}
                      />
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </>
        )}
      </div>
    </DomainPage>
  )
}
