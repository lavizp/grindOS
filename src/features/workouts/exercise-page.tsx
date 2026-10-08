import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router'
import { BarTrend, LineTrend } from '@/components/charts'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { repositories } from '@/db'
import { useWeightUnit } from '@/hooks/use-data'
import {
  getExerciseProgress,
  getPersonalRecords,
  type ExerciseSession,
} from '@/lib/calculations/workouts'
import { parseDayKey } from '@/lib/dates'
import { formatRelativeDay, formatSets, formatWeight } from '@/lib/formatters'

/** Charts show the latest sessions; older ones still count toward records. */
const SESSIONS_CHARTED = 20
const WEIGHTS_LISTED = 6

/** Weights converted between units carry float noise; show at most one decimal. */
const weight = (value: number, unit: 'kg' | 'lb') => formatWeight(Math.round(value * 10) / 10, unit)
const shortDate = (day: string) => format(parseDayKey(day), 'MMM d')

/** /workouts/exercises/:exerciseId: progress and records for one exercise. */
export function ExercisePage() {
  const { exerciseId = '' } = useParams()
  const unit = useWeightUnit()
  // null = not found, undefined = still loading.
  const exercise = useLiveQuery(
    async () => (await repositories.exercises.getById(exerciseId)) ?? null,
    [exerciseId],
  )
  const workouts = useLiveQuery(
    () => repositories.workouts.listByExercise(exerciseId),
    [exerciseId],
  )

  if (exercise === undefined || workouts === undefined) return <PageSkeleton />

  if (exercise === null) {
    return (
      <>
        <PageHeader title="Exercise" backTo="/workouts" />
        <EmptyState
          title="Exercise not found"
          description="It may have been deleted."
          action={
            <Link to="/workouts" className="font-medium underline underline-offset-4">
              Back to workouts
            </Link>
          }
        />
      </>
    )
  }

  const sessions = getExerciseProgress(workouts, exerciseId, unit)
  const records = getPersonalRecords(workouts, exerciseId, unit)
  const charted = sessions.slice(-SESSIONS_CHARTED)
  const weighted = charted.filter((s) => s.topWeight !== null)
  const subtitle = exercise.kind === 'bodyweight' ? 'Bodyweight' : 'With weights'

  return (
    <>
      <PageHeader title={exercise.name} subtitle={subtitle} backTo="/workouts" />

      {sessions.length === 0 ? (
        <EmptyState
          domain="workout"
          title="No sets logged yet"
          description="Add this exercise to a workout. Progress and records show up here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <section aria-label="Personal records" className="grid grid-cols-2 gap-3">
            {records.heaviest && (
              <RecordTile
                label="Heaviest"
                value={weight(records.heaviest.weight!, unit)}
                detail={`${records.heaviest.reps} ${records.heaviest.reps === 1 ? 'rep' : 'reps'}, ${shortDate(records.heaviest.date)}`}
              />
            )}
            {records.bestE1rm && (
              <RecordTile
                label="Best estimated 1RM"
                value={weight(records.bestE1rm.e1rm, unit)}
                detail={`From ${weight(records.bestE1rm.weight!, unit)} × ${records.bestE1rm.reps}`}
              />
            )}
            {records.mostReps && (
              <RecordTile
                label="Most reps"
                value={records.mostReps.reps}
                detail={
                  records.mostReps.weight
                    ? `At ${weight(records.mostReps.weight, unit)}, ${shortDate(records.mostReps.date)}`
                    : shortDate(records.mostReps.date)
                }
              />
            )}
            <RecordTile
              label="Sessions"
              value={sessions.length}
              detail={`Latest: ${formatRelativeDay(sessions.at(-1)!.date)}`}
            />
          </section>

          {weighted.length >= 2 && (
            <SectionCard title="Progress">
              <LineTrend
                data={weighted.map((s) => ({
                  label: shortDate(s.date),
                  top: s.topWeight,
                  e1rm: s.bestE1rm === null ? null : Math.round(s.bestE1rm * 10) / 10,
                }))}
                series={[
                  { dataKey: 'e1rm', color: 'foreground', name: 'Estimated 1RM' },
                  { dataKey: 'top', color: 'workout', name: 'Top set' },
                ]}
                formatValue={(v) => weight(v, unit)}
                domain={['dataMin - 5', 'dataMax + 5']}
                showYAxis={false}
                height={170}
              />
              <Legend
                items={[
                  { label: 'Top set', swatch: 'bg-workout' },
                  { label: 'Estimated 1RM', swatch: 'bg-foreground' },
                ]}
              />
            </SectionCard>
          )}

          {weighted.length >= 2 ? (
            <SectionCard title="Volume per session">
              <BarTrend
                data={weighted.map(toPoint((s) => Math.round(s.volume)))}
                color="workout"
                formatValue={(v) => weight(v, unit)}
                formatKey={(key) => format(parseDayKey(key.slice(0, 10)), 'EEE, MMM d')}
                height={140}
              />
            </SectionCard>
          ) : (
            charted.length >= 2 && (
              <SectionCard title="Reps per session">
                <BarTrend
                  data={charted.map(toPoint((s) => s.totalReps))}
                  color="workout"
                  formatValue={(v) => `${v} reps`}
                  formatKey={(key) => format(parseDayKey(key.slice(0, 10)), 'EEE, MMM d')}
                  height={140}
                />
              </SectionCard>
            )
          )}

          {records.repsByWeight.length > 1 && (
            <SectionCard title="Most reps at each weight">
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                {records.repsByWeight.slice(0, WEIGHTS_LISTED).map((r) => (
                  <div key={r.weight} className="contents">
                    <dt className="tabular font-medium">{weight(r.weight!, unit)}</dt>
                    <dd className="tabular text-right text-muted-foreground">
                      {r.reps} {r.reps === 1 ? 'rep' : 'reps'}, {shortDate(r.date)}
                    </dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          )}

          <SectionCard title="History">
            <ul>
              {[...sessions].reverse().map((session) => (
                <li key={session.workoutId}>
                  <Link
                    to={`/workouts/${session.workoutId}`}
                    className="-mx-2 flex items-baseline justify-between gap-3 rounded-xl px-2 py-2 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
                  >
                    <span className="shrink-0 font-medium">{formatRelativeDay(session.date)}</span>
                    <span className="tabular truncate text-sm text-muted-foreground">
                      {formatSets(roundSets(session), unit)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}
    </>
  )
}

/** Keys combine date and workout id, so two sessions on one day stay separate bars. */
function toPoint(value: (s: ExerciseSession) => number) {
  return (s: ExerciseSession) => ({
    key: `${s.date}:${s.workoutId}`,
    label: shortDate(s.date),
    value: value(s),
  })
}

function roundSets(session: ExerciseSession) {
  return session.sets.map((s) =>
    s.weight === undefined ? s : { ...s, weight: Math.round(s.weight * 10) / 10 },
  )
}

function RecordTile({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <h2 className="font-sans text-sm text-muted-foreground">{label}</h2>
      <p className="tabular mt-1 font-heading text-xl font-semibold">{value}</p>
      <p className="mt-0.5 truncate text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

function Legend({ items }: { items: Array<{ label: string; swatch: string }> }) {
  return (
    <ul className="mt-3 flex gap-4 border-t pt-3 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${item.swatch}`} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
