import { ChevronRight, Dumbbell } from 'lucide-react'
import { Link } from 'react-router'
import type { Exercise, ID, Workout } from '@/db/schema'
import { countSets } from '@/lib/calculations/workouts'
import { formatDuration, formatRelativeDay } from '@/lib/formatters'

interface WorkoutRowProps {
  workout: Workout
  exercises: Map<ID, Exercise>
  /** Leave the date out, e.g. in lists already grouped by day. */
  showDate?: boolean
}

export function WorkoutRow({ workout, exercises, showDate = true }: WorkoutRowProps) {
  const names = workout.entries
    .map((e) => exercises.get(e.exerciseId)?.name)
    .filter((n): n is string => !!n)
  const sets = countSets(workout)
  const details = [
    showDate ? formatRelativeDay(workout.date) : undefined,
    names.length > 0 ? [...new Set(names)].join(', ') : workout.notes,
  ].filter(Boolean)

  return (
    <Link
      to={`/workouts/${workout.id}`}
      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-workout-soft text-workout">
        <Dumbbell className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{workout.name}</span>
        <span className="block truncate text-sm text-muted-foreground">{details.join(', ')}</span>
      </span>
      <span className="tabular shrink-0 text-sm font-medium">
        {workout.durationMin
          ? formatDuration(workout.durationMin)
          : sets > 0
            ? `${sets} ${sets === 1 ? 'set' : 'sets'}`
            : ''}
      </span>
    </Link>
  )
}

interface ExerciseLinkProps {
  exercise: Exercise | undefined
  exerciseId: ID
  detail: string
}

export function ExerciseLink({ exercise, exerciseId, detail }: ExerciseLinkProps) {
  return (
    <Link
      to={`/workouts/exercises/${exerciseId}`}
      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{exercise?.name ?? 'Unknown exercise'}</span>
        <span className="block truncate text-sm text-muted-foreground">{detail}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  )
}
