import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BodyWeightInput, ID, WeightUnit } from '@/db/schema'
import {
  bodyWeightFormSchema,
  type BodyWeightFormValues,
} from '@/features/body-weight/body-weight-form-schema'
import { addDaysToKey, todayKey, type DayKey } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const BODY_WEIGHT_FORM_ID = 'body-weight-form'

interface BodyWeightFormProps {
  defaultValues: BodyWeightFormValues
  unit: WeightUnit
  loggedDays: Map<DayKey, ID>
  editingId?: ID
  /** Shown as the placeholder, so the usual small change is easy to type. */
  lastWeight?: number
  onSubmit: (input: BodyWeightInput) => void | Promise<void>
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

/** Weight → date → note. The Save button lives in the sheet footer. */
export function BodyWeightForm({
  defaultValues,
  unit,
  loggedDays,
  editingId,
  lastWeight,
  onSubmit,
}: BodyWeightFormProps) {
  const today = todayKey()
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BodyWeightFormValues, unknown, BodyWeightInput>({
    defaultValues,
    resolver: zodResolver(bodyWeightFormSchema({ unit, loggedDays, editingId, today })),
  })
  const [showNotes, setShowNotes] = useState(defaultValues.notes !== '')
  const date = useWatch({ control, name: 'date' })
  const yesterday = addDaysToKey(today, -1)
  const existing = loggedDays.get(date)
  const otherDay = existing && existing !== editingId ? existing : undefined

  return (
    <form
      id={BODY_WEIGHT_FORM_ID}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <div>
        <Label htmlFor="body-weight" className="sr-only">
          Weight
        </Label>
        <div className="flex items-baseline gap-2 border-b-2 border-border pb-2 focus-within:border-workout has-aria-invalid:border-destructive">
          <input
            id="body-weight"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            placeholder={lastWeight === undefined ? '0' : String(lastWeight)}
            autoFocus={defaultValues.weight === ''}
            aria-invalid={!!errors.weight}
            aria-describedby={errors.weight ? 'weight-error' : undefined}
            className="tabular w-full min-w-0 bg-transparent font-heading text-[2.75rem]! leading-none font-semibold outline-none placeholder:text-muted-foreground/50"
            {...register('weight')}
          />
          <span className="font-heading text-2xl font-medium text-muted-foreground">{unit}</span>
        </div>
        <FieldError id="weight-error" message={errors.weight?.message} />
      </div>

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
                setValue('date', option.value, { shouldDirty: true, shouldValidate: !!errors.date })
              }
              className={cn(chip, date === option.value ? chipActive : chipIdle)}
            >
              {option.label}
            </button>
          ))}
          <Label htmlFor="body-weight-date" className="sr-only">
            Pick a date
          </Label>
          <input
            id="body-weight-date"
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
        {otherDay && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            You already logged this day.{' '}
            <Link
              to={`/workouts/body-weight/${otherDay}`}
              replace
              className="font-medium text-foreground underline underline-offset-4"
            >
              Edit it instead
            </Link>
          </p>
        )}
      </fieldset>

      {showNotes ? (
        <div>
          <Label htmlFor="body-weight-notes" className="mb-2">
            Note
          </Label>
          <Textarea
            id="body-weight-notes"
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
    </form>
  )
}
