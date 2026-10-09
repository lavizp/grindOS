import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ClipboardList, Trash2 } from 'lucide-react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { FormSheet } from '@/components/common/form-sheet'
import { Button } from '@/components/ui/button'
import { repositories } from '@/db'
import type { Exercise, ID, Workout, WorkoutInput } from '@/db/schema'
import { useExercises, useRecentWorkouts, useTemplates, useWeightUnit } from '@/hooks/use-data'
import { useCloseRoute } from '@/hooks/use-close-route'
import { clearDraft, loadDraft, saveDraft } from '@/features/workouts/workout-draft'
import { WORKOUT_FORM_ID, WorkoutForm } from '@/features/workouts/workout-form'
import {
  emptyWorkoutForm,
  hasProgress,
  workoutToForm,
  toTemplateInput,
  workoutToInput,
  type WorkoutFormValues,
} from '@/features/workouts/workout-form-schema'
import { findNewRecords } from '@/lib/calculations/workouts'

/** /workouts/new and /workouts/:id, shown as a sheet over the Workouts page. */
export function WorkoutSheet() {
  const { id } = useParams()
  const close = useCloseRoute('/workouts')
  const settingsUnit = useWeightUnit()
  const exercises = useExercises({ includeArchived: true })
  const history = useRecentWorkouts()
  const templates = useTemplates()
  // null = not found, undefined = still loading.
  const workout = useLiveQuery(
    async () => (id ? ((await repositories.workouts.getById(id)) ?? null) : null),
    [id],
  )
  const isEdit = id !== undefined
  // A new workout picks up an unsaved draft, if there is one.
  const [draft, setDraft] = useState(() => (isEdit ? null : loadDraft()))
  const [formKey, setFormKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loading =
    exercises === undefined ||
    history === undefined ||
    templates === undefined ||
    workout === undefined
  const unit = workout?.unit ?? draft?.unit ?? settingsUnit

  const keepDraft = useCallback(
    (values: WorkoutFormValues) => {
      if (hasProgress(values)) saveDraft(values, unit)
      else clearDraft()
    },
    [unit],
  )

  function discardDraft() {
    clearDraft()
    setDraft(null)
    setFormKey((k) => k + 1)
  }

  async function save(input: WorkoutInput) {
    setSaving(true)
    try {
      if (workout) await update(workout, input)
      else {
        await create(input, exercises ?? [])
        clearDraft()
      }
      close()
    } catch (error) {
      toast.error('Couldn’t save the workout', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  async function remove(target: Workout) {
    await repositories.workouts.remove(target.id)
    toast.success('Workout deleted')
    close()
  }

  const defaultValues = workout ? workoutToForm(workout) : (draft?.values ?? emptyWorkoutForm())

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && close()}
      title={isEdit ? 'Edit workout' : 'Log workout'}
      footer={
        workout !== null || !isEdit ? (
          <div className="flex gap-2">
            {workout && (
              <ConfirmDelete
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete this workout?"
                onConfirm={() => remove(workout)}
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-lg"
                    className="size-12 rounded-full"
                    aria-label="Delete workout"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </Button>
                }
              />
            )}
            <Button
              type="submit"
              form={WORKOUT_FORM_ID}
              disabled={loading || saving}
              className="h-12 flex-1 rounded-full bg-workout text-base text-on-accent hover:bg-workout/90"
            >
              {isEdit ? 'Save changes' : 'Save workout'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="h-96" aria-busy="true" />
      ) : isEdit && workout === null ? (
        <p className="py-10 text-center text-muted-foreground">
          This workout doesn’t exist anymore. It may have been deleted.
        </p>
      ) : (
        <>
          {draft && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
              <p>Picked up your unsaved workout.</p>
              <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
                Discard
              </Button>
            </div>
          )}
          <WorkoutForm
            key={`${workout?.id ?? 'new'}-${formKey}`}
            defaultValues={defaultValues}
            unit={unit}
            exercises={exercises}
            history={history}
            editingId={workout?.id}
            templates={templates}
            onSubmit={save}
            onValuesChange={isEdit ? undefined : keepDraft}
            createExercise={(name, kind) => repositories.exercises.findOrCreate(name, kind)}
          />
          {workout && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveAsTemplate(workout)}
              className="mt-6 h-11 w-full rounded-xl"
            >
              <ClipboardList data-icon="inline-start" aria-hidden />
              Save as template
            </Button>
          )}
        </>
      )}
    </FormSheet>
  )
}

async function create(input: WorkoutInput, exercises: Exercise[]) {
  const created = await repositories.workouts.create(input)
  toast.success('Workout logged', {
    description: await describeRecords(created, exercises),
    action: { label: 'Undo', onClick: () => void repositories.workouts.remove(created.id) },
  })
}

async function update(previous: Workout, input: WorkoutInput) {
  await repositories.workouts.update(previous.id, input)
  toast.success('Changes saved', {
    action: {
      label: 'Undo',
      onClick: () => void repositories.workouts.update(previous.id, workoutToInput(previous)),
    },
  })
}

/** Saves the logged workout's exercises and sets as a template, replacing one with the same name. */
async function saveAsTemplate(workout: Workout) {
  const values = toTemplateInput(workoutToInput(workout))
  try {
    const existing = await repositories.templates.getByName(workout.name)
    if (existing) {
      await repositories.templates.update(existing.id, values)
      const previous = toTemplateInput(existing)
      toast.success(`${existing.name} template updated`, {
        action: {
          label: 'Undo',
          onClick: () => void repositories.templates.update(existing.id, previous),
        },
      })
    } else {
      const created = await repositories.templates.create(values)
      toast.success(`Saved as the ${created.name} template`, {
        action: { label: 'Undo', onClick: () => void repositories.templates.remove(created.id) },
      })
    }
  } catch (error) {
    toast.error('Couldn’t save the template', {
      description: error instanceof Error ? error.message : undefined,
    })
  }
}

/** "New record: Bench Press" when a set beats every earlier one. */
async function describeRecords(workout: Workout, exercises: Exercise[]) {
  const related = await Promise.all(
    workout.exerciseIds.map((exerciseId: ID) => repositories.workouts.listByExercise(exerciseId)),
  )
  const records = findNewRecords(workout, related.flat())
  if (records.length === 0) return undefined
  const names = records.map(
    (r) => exercises.find((e) => e.id === r.exerciseId)?.name ?? 'an exercise',
  )
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return `New ${names.length === 1 ? 'record' : 'records'}: ${list}`
}
