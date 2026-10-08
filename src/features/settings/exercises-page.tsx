import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Search } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { repositories } from '@/db'
import type { Exercise } from '@/db/schema'
import { useExercises } from '@/hooks/use-data'
import { ExerciseSheet } from '@/features/settings/exercise-sheet'
import { searchExercises } from '@/features/workouts/exercise-search'

/** /settings/exercises: rename, merge duplicates, archive and restore exercises. */
export function ExercisesPage() {
  const all = useExercises({ includeArchived: true })
  const usage = useLiveQuery(() => repositories.exercises.usageCounts(), [])
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  if (all === undefined || usage === undefined) {
    return (
      <>
        <PageHeader title="Exercises" backTo="/settings" />
        <PageSkeleton />
      </>
    )
  }

  const matches = searchExercises(all, query)
  const active = matches.filter((e) => !e.archived)
  const archived = matches.filter((e) => e.archived)
  // Looked up live, so the sheet reflects saves (and closes if the exercise is merged away).
  const editing = all.find((e) => e.id === editingId) ?? null

  return (
    <>
      <PageHeader title="Exercises" backTo="/settings" />
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          aria-label="Search exercises"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full rounded-xl border bg-card pr-3 pl-9 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-4">
        <SectionCard title="Exercises" aside={`${active.length}`}>
          {active.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No exercises match.</p>
          ) : (
            <ExerciseList exercises={active} usage={usage} onPick={setEditingId} />
          )}
        </SectionCard>
        {archived.length > 0 && (
          <SectionCard title="Archived" aside="Hidden when adding exercises">
            <ExerciseList exercises={archived} usage={usage} onPick={setEditingId} />
          </SectionCard>
        )}
        <p className="px-1 text-sm text-muted-foreground">
          New exercises are added while logging a workout.
        </p>
      </div>

      <ExerciseSheet
        exercise={editing}
        exercises={all}
        usage={usage}
        onClose={() => setEditingId(null)}
      />
    </>
  )
}

interface ExerciseListProps {
  exercises: Exercise[]
  usage: Map<string, number>
  onPick: (id: string) => void
}

function ExerciseList({ exercises, usage, onPick }: ExerciseListProps) {
  return (
    <ul>
      {exercises.map((exercise) => {
        const count = usage.get(exercise.id) ?? 0
        return (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onPick(exercise.id)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{exercise.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {exercise.kind === 'bodyweight' ? 'Bodyweight' : 'With weights'},{' '}
                  {count === 0
                    ? 'not used yet'
                    : `${count} ${count === 1 ? 'workout' : 'workouts'}`}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
