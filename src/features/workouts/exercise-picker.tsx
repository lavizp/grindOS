import { useId, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Exercise, ExerciseKind } from '@/db/schema'
import { exerciseNameKey } from '@/db/seed'
import { searchExercises } from '@/features/workouts/exercise-search'

const MAX_RESULTS = 8

interface ExercisePickerProps {
  exercises: Exercise[]
  /** Exercises already in the workout, listed last. */
  usedIds: Set<string>
  onPick: (exercise: Exercise) => void
  onCreate: (name: string, kind: ExerciseKind) => Promise<void>
  onCancel: () => void
}

/** Search the catalog, or create a new exercise from what was typed. */
export function ExercisePicker({
  exercises,
  usedIds,
  onPick,
  onCreate,
  onCancel,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const listId = useId()
  const name = query.trim()
  const results = searchExercises(exercises, query, usedIds).slice(0, MAX_RESULTS)
  const exact = exercises.some((e) => e.nameKey === exerciseNameKey(name))

  async function create(kind: ExerciseKind) {
    setCreating(true)
    try {
      await onCreate(name, kind)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="rounded-2xl bg-muted/60 p-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="search"
          aria-label="Search exercises"
          aria-controls={listId}
          placeholder="Search or add an exercise"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              onCancel()
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (results[0] && (exact || results.length === 1)) onPick(results[0])
            }
          }}
          className="h-11 w-full rounded-xl border bg-card pr-3 pl-9 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <ul id={listId} aria-label="Exercises" className="mt-2 flex flex-col">
        {results.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onPick(exercise)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate font-medium">{exercise.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {usedIds.has(exercise.id)
                  ? 'In this workout'
                  : exercise.kind === 'bodyweight'
                    ? 'Bodyweight'
                    : ''}
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && name === '' && (
          <li className="px-2 py-2.5 text-sm text-muted-foreground">No exercises yet.</li>
        )}
      </ul>

      {name !== '' && !exact && (
        <div className="mt-2 border-t pt-3">
          <p className="mb-2 px-1 text-sm text-muted-foreground">
            Add “<span className="font-medium text-foreground">{name}</span>” as a new exercise
          </p>
          <div className="flex flex-wrap gap-2">
            {(['weighted', 'bodyweight'] as const).map((kind) => (
              <Button
                key={kind}
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() => create(kind)}
                className="h-9 rounded-full bg-card"
              >
                <Plus data-icon="inline-start" aria-hidden />
                {kind === 'weighted' ? 'With weights' : 'Bodyweight'}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        className="mt-2 h-9 w-full text-muted-foreground"
      >
        Cancel
      </Button>
    </div>
  )
}
