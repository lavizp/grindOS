import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, Plus, Repeat2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  Exercise,
  ExerciseKind,
  ID,
  WeightUnit,
  Workout,
  WorkoutInput,
  WorkoutTemplate,
} from '@/db/schema'
import { EntryEditor, type LastTime } from '@/features/workouts/entry-editor'
import { ExercisePicker } from '@/features/workouts/exercise-picker'
import {
  copySets,
  DEFAULT_WORKOUT_NAMES,
  repeatEntries,
  workoutFormSchema,
  type WorkoutFormValues,
} from '@/features/workouts/workout-form-schema'
import { setsFor } from '@/lib/calculations/workouts'
import { addDaysToKey, todayKey } from '@/lib/dates'
import { formatRelativeDay, formatSets } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export const WORKOUT_FORM_ID = 'workout-form'

const MAX_NAME_CHIPS = 8

interface WorkoutFormProps {
  defaultValues: WorkoutFormValues
  unit: WeightUnit
  /** The whole catalog, archived included, so old entries keep their names. */
  exercises: Exercise[]
  /** Recent workouts, newest first: names, "repeat last" and "last time" hints. */
  history: Workout[]
  editingId?: ID
  /** Saved routines to start from while the workout has no exercises yet. */
  templates?: WorkoutTemplate[]
  /** A template keeps only the name, exercises and sets, so the session details are hidden. */
  variant?: 'workout' | 'template'
  onSubmit: (input: WorkoutInput) => void | Promise<void>
  /** Called on every change, e.g. to keep a draft. */
  onValuesChange?: (values: WorkoutFormValues) => void
  createExercise: (name: string, kind: ExerciseKind) => Promise<Exercise>
}

const chip =
  'touch-target relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-[color,background-color,scale] outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]'
const chipIdle = 'border-border bg-card text-foreground hover:bg-muted'
const chipActive = 'border-transparent bg-foreground text-background'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  )
}

/** Name → exercises and sets → details → note. The Save button lives in the sheet footer. */
export function WorkoutForm({
  defaultValues,
  unit,
  exercises,
  history,
  editingId,
  templates = [],
  variant = 'workout',
  onSubmit,
  onValuesChange,
  createExercise,
}: WorkoutFormProps) {
  const today = todayKey()
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<WorkoutFormValues, unknown, WorkoutInput>({
    defaultValues,
    resolver: zodResolver(workoutFormSchema({ unit, today })),
  })
  const { fields, append, move, remove, replace } = useFieldArray({ control, name: 'entries' })
  const [name, date] = useWatch({ control, name: ['name', 'date'] })
  const [picking, setPicking] = useState(false)
  const [showNotes, setShowNotes] = useState(defaultValues.notes !== '')

  const values = useWatch({ control })
  useEffect(() => {
    onValuesChange?.(values as WorkoutFormValues)
  }, [values, onValuesChange])

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const earlier = useMemo(
    () => history.filter((w) => w.id !== editingId && w.date <= date),
    [history, editingId, date],
  )

  const nameChips = useMemo(() => {
    const seen = new Set<string>()
    return [...history.map((w) => w.name), ...DEFAULT_WORKOUT_NAMES]
      .filter((n) => {
        const key = n.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, MAX_NAME_CHIPS)
  }, [history])

  const nameKey = name.trim().toLowerCase()
  const previous =
    nameKey === ''
      ? undefined
      : earlier.find((w) => w.name.toLowerCase() === nameKey && w.entries.length > 0)

  function lastTimeFor(exerciseId: ID): LastTime | undefined {
    const workout = earlier.find((w) => w.exerciseIds.includes(exerciseId))
    if (!workout) return undefined
    const sets = setsFor(workout, exerciseId)
    return {
      when: formatRelativeDay(workout.date, today),
      summary: formatSets(sets, workout.unit),
      sets: copySets(sets, workout.unit, unit),
    }
  }

  function addExercise(exercise: Exercise) {
    setPicking(false)
    // Start from last time's sets; most sessions repeat or nudge them.
    const sets = lastTimeFor(exercise.id)?.sets ?? [{ reps: '', weight: '' }]
    append({ exerciseId: exercise.id, sets }, { shouldFocus: false })
  }

  function applyTemplate(template: WorkoutTemplate) {
    setValue('name', template.name, { shouldDirty: true, shouldValidate: !!errors.name })
    replace(repeatEntries(template, unit))
  }

  const isTemplate = variant === 'template'
  const usedIds = new Set(fields.map((f) => f.exerciseId))
  const yesterday = addDaysToKey(today, -1)

  return (
    <form
      id={WORKOUT_FORM_ID}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <div>
        <Label htmlFor="workout-name" className="mb-2">
          {isTemplate ? 'Name' : 'Workout'}
        </Label>
        <Input
          id="workout-name"
          placeholder="Push, Legs, Run…"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          className="h-11 rounded-xl bg-card"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
        <FieldError id="name-error" message={errors.name?.message} />
        <div
          aria-label="Workout names"
          className="-mx-5 mt-2 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1"
        >
          {nameChips.map((chipName) => {
            const selected = chipName.toLowerCase() === nameKey
            return (
              <button
                key={chipName}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setValue('name', chipName, { shouldDirty: true, shouldValidate: !!errors.name })
                }
                className={cn(chip, selected ? chipActive : chipIdle)}
              >
                {chipName}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-sans text-sm font-medium">Exercises</h3>
          {fields.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {fields.length === 1 ? '1 exercise' : `${fields.length} exercises`}
            </span>
          )}
        </div>

        {fields.length === 0 && !isTemplate && templates.length > 0 && (
          <div role="group" aria-label="Templates" className="flex flex-col gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ClipboardList className="size-5 shrink-0 text-workout" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-medium">Start {template.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {template.entries.length === 0
                      ? 'No exercises'
                      : template.entries
                          .map((e) => exerciseById.get(e.exerciseId)?.name ?? 'Unknown exercise')
                          .join(', ')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {fields.length === 0 && previous && (
          <button
            type="button"
            onClick={() => replace(repeatEntries(previous, unit))}
            className="flex items-center gap-3 rounded-2xl border border-dashed border-workout/50 bg-workout-soft px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Repeat2 className="size-5 shrink-0 text-workout" aria-hidden />
            <span className="min-w-0">
              <span className="block font-medium">Repeat last {previous.name}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {formatRelativeDay(previous.date, today)}:{' '}
                {previous.entries
                  .map((e) => exerciseById.get(e.exerciseId)?.name ?? 'Unknown exercise')
                  .join(', ')}
              </span>
            </span>
          </button>
        )}

        {fields.map((field, index) => (
          <EntryEditor
            key={field.id}
            index={index}
            count={fields.length}
            control={control}
            register={register}
            getValues={getValues}
            errors={errors}
            exercise={exerciseById.get(field.exerciseId)}
            unit={unit}
            lastTime={lastTimeFor(field.exerciseId)}
            onMove={move}
            onRemove={remove}
          />
        ))}

        {picking ? (
          <ExercisePicker
            exercises={exercises.filter((e) => !e.archived)}
            usedIds={usedIds}
            onPick={addExercise}
            onCreate={async (exerciseName, kind) =>
              addExercise(await createExercise(exerciseName, kind))
            }
            onCancel={() => setPicking(false)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setPicking(true)}
            className="h-11 rounded-xl border-dashed bg-transparent"
          >
            <Plus data-icon="inline-start" aria-hidden />
            Add exercise
          </Button>
        )}
      </div>

      {!isTemplate && (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Date</legend>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: today, label: 'Today' },
                { value: yesterday, label: 'Yesterday' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={date === option.value}
                  onClick={() =>
                    setValue('date', option.value, { shouldDirty: true, shouldValidate: true })
                  }
                  className={cn(chip, date === option.value ? chipActive : chipIdle)}
                >
                  {option.label}
                </button>
              ))}
              <Label htmlFor="workout-date" className="sr-only">
                Pick a date
              </Label>
              <input
                id="workout-date"
                type="date"
                max={today}
                aria-invalid={!!errors.date}
                className={cn(
                  chip,
                  'min-w-0 text-base',
                  date !== today && date !== yesterday ? chipActive : chipIdle,
                )}
                {...register('date')}
              />
            </div>
            <FieldError id="date-error" message={errors.date?.message} />
          </fieldset>

          {/* iOS gives time inputs a native minimum width unless their appearance is reset. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label htmlFor="start-time" className="mb-2">
                Started at
              </Label>
              <input
                id="start-time"
                type="time"
                aria-invalid={!!errors.startTime}
                className="tabular h-11 w-full min-w-0 appearance-none rounded-xl border bg-card px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-date-and-time-value]:text-left"
                {...register('startTime')}
              />
              <FieldError id="start-error" message={errors.startTime?.message} />
            </div>
            <div className="min-w-0">
              <Label htmlFor="duration" className="mb-2">
                Minutes
              </Label>
              <Input
                id="duration"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Optional"
                aria-invalid={!!errors.durationMin}
                aria-describedby={errors.durationMin ? 'duration-error' : undefined}
                className="tabular h-11 rounded-xl bg-card"
                {...register('durationMin')}
              />
              <FieldError id="duration-error" message={errors.durationMin?.message} />
            </div>
          </div>

          {showNotes ? (
            <div>
              <Label htmlFor="notes" className="mb-2">
                Note
              </Label>
              <Textarea
                id="notes"
                rows={3}
                autoFocus={defaultValues.notes === ''}
                className="rounded-xl bg-card"
                {...register('notes')}
              />
              <FieldError id="notes-error" message={errors.notes?.message} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="self-start text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              Add a note
            </button>
          )}
        </>
      )}
    </form>
  )
}
