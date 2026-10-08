import { useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, Merge } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { FormSheet } from '@/components/common/form-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { repositories } from '@/db'
import { DuplicateRecordError } from '@/db/repositories'
import type { Exercise, ExerciseKind } from '@/db/schema'

const FORM_ID = 'exercise-form'

interface ExerciseSheetProps {
  exercise: Exercise | null
  /** Every exercise, for picking a merge target. */
  exercises: Exercise[]
  usage: Map<string, number>
  onClose: () => void
}

export function ExerciseSheet({ exercise, exercises, usage, onClose }: ExerciseSheetProps) {
  return (
    <FormSheet
      open={exercise !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Edit exercise"
      footer={
        exercise && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full px-5"
              onClick={async () => {
                const archived = !exercise.archived
                await repositories.exercises.update(exercise.id, { archived })
                toast.success(`${exercise.name} ${archived ? 'archived' : 'restored'}`)
                onClose()
              }}
            >
              {exercise.archived ? (
                <ArchiveRestore data-icon="inline-start" aria-hidden />
              ) : (
                <Archive data-icon="inline-start" aria-hidden />
              )}
              {exercise.archived ? 'Restore' : 'Archive'}
            </Button>
            <Button type="submit" form={FORM_ID} className="h-12 flex-1 rounded-full text-base">
              Save changes
            </Button>
          </div>
        )
      }
    >
      {exercise && (
        <ExerciseForm
          key={exercise.id}
          exercise={exercise}
          others={exercises.filter((e) => e.id !== exercise.id)}
          usage={usage}
          onDone={onClose}
        />
      )}
    </FormSheet>
  )
}

interface ExerciseFormProps {
  exercise: Exercise
  others: Exercise[]
  usage: Map<string, number>
  onDone: () => void
}

function ExerciseForm({ exercise, others, usage, onDone }: ExerciseFormProps) {
  const [name, setName] = useState(exercise.name)
  const [kind, setKind] = useState<ExerciseKind>(exercise.kind)
  const [error, setError] = useState<string | null>(null)
  const [mergeInto, setMergeInto] = useState('')
  const [confirmMerge, setConfirmMerge] = useState(false)
  const target = others.find((e) => e.id === mergeInto)
  const used = usage.get(exercise.id) ?? 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Name the exercise')
    try {
      await repositories.exercises.update(exercise.id, { name: trimmed, kind })
      toast.success('Changes saved')
      onDone()
    } catch (err) {
      if (err instanceof DuplicateRecordError) {
        setError(`There’s already an exercise called ${trimmed}. Merge into it instead.`)
      } else {
        throw err
      }
    }
  }

  async function merge() {
    if (!target) return
    const moved = await repositories.exercises.merge(exercise.id, target.id)
    toast.success(`Merged into ${target.name}`, {
      description: `${moved} ${moved === 1 ? 'workout' : 'workouts'} updated.`,
    })
    onDone()
  }

  return (
    <form id={FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-6">
      <div>
        <Label htmlFor="exercise-name" className="mb-2">
          Name
        </Label>
        <Input
          id="exercise-name"
          value={name}
          maxLength={80}
          autoComplete="off"
          autoCapitalize="words"
          aria-invalid={!!error}
          aria-describedby={error ? 'exercise-name-error' : undefined}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          className="h-11 rounded-xl bg-card"
        />
        {error && (
          <p id="exercise-name-error" role="alert" className="mt-1.5 text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="mt-1.5 text-sm text-muted-foreground">
          Used in {used} {used === 1 ? 'workout' : 'workouts'}.
        </p>
      </div>

      <div>
        <span id="kind-label" className="mb-2 block text-sm font-medium">
          Type
        </span>
        <Tabs value={kind} onValueChange={(value) => setKind(value as ExerciseKind)}>
          <TabsList aria-labelledby="kind-label">
            <TabsTrigger value="weighted">With weights</TabsTrigger>
            <TabsTrigger value="bodyweight">Bodyweight</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <fieldset className="rounded-2xl bg-muted/60 p-3">
        <legend className="sr-only">Merge</legend>
        <Label htmlFor="merge-into" className="mb-1">
          Merge into another exercise
        </Label>
        <p className="mb-2 text-sm text-muted-foreground">
          For duplicates. Its workouts move to the other exercise, and this one is removed.
        </p>
        <div className="flex gap-2">
          <select
            id="merge-into"
            value={mergeInto}
            onChange={(e) => setMergeInto(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Pick an exercise</option>
            {others.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={!target}
            onClick={() => setConfirmMerge(true)}
            className="h-10 rounded-xl"
          >
            <Merge data-icon="inline-start" aria-hidden />
            Merge
          </Button>
        </div>
      </fieldset>

      <ConfirmDelete
        open={confirmMerge}
        onOpenChange={setConfirmMerge}
        title={target ? `Merge ${exercise.name} into ${target.name}?` : 'Merge?'}
        description={`Its ${used} ${used === 1 ? 'workout moves' : 'workouts move'} to ${target?.name}, and ${exercise.name} is removed. This can’t be undone.`}
        confirmLabel="Merge"
        onConfirm={merge}
      />
    </form>
  )
}
