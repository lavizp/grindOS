import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
} from 'react-hook-form'
import { Button } from '@/components/ui/button'
import type { Exercise, WeightUnit, WorkoutInput } from '@/db/schema'
import type { SetValues, WorkoutFormValues } from '@/features/workouts/workout-form-schema'

export interface LastTime {
  /** "Oct 3" */
  when: string
  summary: string
  sets: SetValues[]
}

interface EntryEditorProps {
  index: number
  count: number
  control: Control<WorkoutFormValues, unknown, WorkoutInput>
  register: UseFormRegister<WorkoutFormValues>
  getValues: UseFormGetValues<WorkoutFormValues>
  errors: FieldErrors<WorkoutFormValues>
  exercise: Exercise | undefined
  unit: WeightUnit
  lastTime?: LastTime
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
}

const setInput =
  'tabular h-11 w-full min-w-0 rounded-xl border bg-card px-2 text-center font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive'

/** One exercise: its sets as reps × weight rows, with "last time" for reference. */
export function EntryEditor({
  index,
  count,
  control,
  register,
  getValues,
  errors,
  exercise,
  unit,
  lastTime,
  onMove,
  onRemove,
}: EntryEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: `entries.${index}.sets` })
  const name = exercise?.name ?? 'Unknown exercise'
  const bodyweight = exercise?.kind === 'bodyweight'
  const entryErrors = errors.entries?.[index]

  function addSet() {
    // Copies the set above, so the usual case (same again) is one tap.
    const values = getValues(`entries.${index}.sets`)
    const previous = values[values.length - 1] ?? lastTime?.sets[0]
    append(previous ? { ...previous } : { reps: '', weight: '' }, { shouldFocus: false })
  }

  return (
    <section aria-label={name} className="rounded-2xl bg-muted/60 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 pt-1.5 pl-1">
          <h3 className="truncate font-sans text-base font-semibold">{name}</h3>
          {lastTime && (
            <p className="truncate text-sm text-muted-foreground">
              Last time ({lastTime.when}): {lastTime.summary}
            </p>
          )}
        </div>
        <div className="flex shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            aria-label={`Move ${name} up`}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === count - 1}
            onClick={() => onMove(index, index + 1)}
            aria-label={`Move ${name} down`}
          >
            <ArrowDown aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${name}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      <ol className="mt-2 flex flex-col gap-1.5">
        {fields.map((field, setIndex) => {
          const setErrors = entryErrors?.sets?.[setIndex]
          const message = setErrors?.reps?.message ?? setErrors?.weight?.message
          const label = `Set ${setIndex + 1}`
          return (
            <li key={field.id}>
              <div className="flex items-center gap-2">
                <span className="tabular w-6 shrink-0 text-center text-sm text-muted-foreground">
                  {setIndex + 1}
                </span>
                <label className="flex min-w-0 flex-1 items-center gap-1.5">
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder="0"
                    aria-label={`${label} reps`}
                    aria-invalid={!!setErrors?.reps}
                    className={setInput}
                    {...register(`entries.${index}.sets.${setIndex}.reps`)}
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">reps</span>
                </label>
                {!bodyweight && (
                  <label className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="shrink-0 text-sm text-muted-foreground">×</span>
                    <input
                      inputMode="decimal"
                      autoComplete="off"
                      enterKeyHint="next"
                      placeholder="0"
                      aria-label={`${label} weight`}
                      aria-invalid={!!setErrors?.weight}
                      className={setInput}
                      {...register(`entries.${index}.sets.${setIndex}.weight`)}
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">{unit}</span>
                  </label>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(setIndex)}
                  disabled={fields.length === 1}
                  aria-label={`Remove ${label.toLowerCase()} of ${name}`}
                  className="shrink-0 text-muted-foreground"
                >
                  <X aria-hidden />
                </Button>
              </div>
              {message && (
                <p role="alert" className="mt-1 pl-8 text-sm text-destructive">
                  {message}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      <Button
        type="button"
        variant="ghost"
        onClick={addSet}
        className="mt-1.5 h-10 w-full rounded-xl font-medium"
      >
        <Plus data-icon="inline-start" aria-hidden />
        Add set
      </Button>
    </section>
  )
}
