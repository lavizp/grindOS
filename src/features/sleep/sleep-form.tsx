import { useState, type ComponentProps } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ID, SleepInput } from '@/db/schema'
import { QUALITY_LEVELS } from '@/features/sleep/quality'
import {
  previewDuration,
  sleepFormSchema,
  type SleepFormValues,
} from '@/features/sleep/sleep-form-schema'
import {
  addDaysToKey,
  isDayKey,
  parseLocalDateTime,
  resolveSleepTimes,
  todayKey,
  type DayKey,
} from '@/lib/dates'
import { formatDuration } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export const SLEEP_FORM_ID = 'sleep-form'

interface SleepFormProps {
  defaultValues: SleepFormValues
  loggedNights: Map<DayKey, ID>
  editingId?: ID
  targetMin: number
  onSubmit: (input: SleepInput) => void | Promise<void>
}

const chip =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring'
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

/** Bedtime and wake time → quality → night → note. The Save button lives in the sheet footer. */
export function SleepForm({
  defaultValues,
  loggedNights,
  editingId,
  targetMin,
  onSubmit,
}: SleepFormProps) {
  const today = todayKey()
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SleepFormValues, unknown, SleepInput>({
    defaultValues,
    resolver: zodResolver(sleepFormSchema({ loggedNights, editingId, today })),
  })
  const [showNotes, setShowNotes] = useState(defaultValues.notes !== '')
  const [date, bedtime, wakeTime] = useWatch({ control, name: ['date', 'bedtime', 'wakeTime'] })

  const yesterday = addDaysToKey(today, -1)
  const duration = previewDuration(bedtime, wakeTime)
  const existingNight = loggedNights.get(date)
  const otherNight = existingNight && existingNight !== editingId ? existingNight : undefined

  return (
    <form
      id={SLEEP_FORM_ID}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <div>
        <div className="grid grid-cols-2 gap-2">
          <TimeTile
            id="bedtime"
            label="Went to bed"
            invalid={!!errors.bedtime}
            {...register('bedtime')}
          />
          <TimeTile
            id="wakeTime"
            label="Woke up"
            invalid={!!errors.wakeTime}
            describedBy={errors.wakeTime ? 'wake-error' : undefined}
            {...register('wakeTime')}
          />
        </div>
        <FieldError id="bedtime-error" message={errors.bedtime?.message} />
        <FieldError id="wake-error" message={errors.wakeTime?.message} />
        <DurationPreview
          duration={duration}
          targetMin={targetMin}
          date={date}
          bedtime={bedtime}
          wakeTime={wakeTime}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          How did you sleep? <span className="font-normal text-muted-foreground">Optional</span>
        </legend>
        <Controller
          control={control}
          name="quality"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Quality" className="grid grid-cols-5 gap-1.5">
              {QUALITY_LEVELS.map((level) => {
                const selected = field.value === level.value
                const Icon = level.icon
                return (
                  <button
                    key={level.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    // Tapping the chosen level again clears it.
                    onClick={() => field.onChange(selected ? null : level.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-transparent bg-sleep text-on-accent'
                        : 'border-transparent bg-muted/70 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                    {level.label}
                  </button>
                )
              })}
            </div>
          )}
        />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Night</legend>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: today, label: 'Last night' },
            { value: yesterday, label: 'Night before' },
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
          <Label htmlFor="date" className="sr-only">
            Morning you woke up
          </Label>
          <input
            id="date"
            type="date"
            max={today}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? 'date-error' : undefined}
            className={cn(
              chip,
              'min-w-0 text-base',
              date !== today && date !== yesterday ? chipActive : chipIdle,
            )}
            {...register('date')}
          />
        </div>
        {errors.date && (
          <p id="date-error" role="alert" className="mt-1.5 text-sm text-destructive">
            {errors.date.message}
            {otherNight && (
              <>
                {' '}
                <Link
                  to={`/sleep/${otherNight}`}
                  replace
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Edit that night
                </Link>
              </>
            )}
          </p>
        )}
      </fieldset>

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
    </form>
  )
}

interface TimeTileProps extends ComponentProps<'input'> {
  id: string
  label: string
  invalid: boolean
  describedBy?: string
}

function TimeTile({ id, label, invalid, describedBy, ...input }: TimeTileProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-transparent bg-muted px-3.5 pt-2.5 pb-2 focus-within:border-sleep',
        invalid && 'border-destructive focus-within:border-destructive',
      )}
    >
      <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
        {label}
      </Label>
      <input
        id={id}
        type="time"
        required
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="tabular mt-0.5 w-full min-w-0 bg-transparent font-heading text-[1.75rem]! leading-tight font-semibold outline-none [&::-webkit-calendar-picker-indicator]:hidden"
        {...input}
      />
    </div>
  )
}

interface DurationPreviewProps {
  duration: number | null
  targetMin: number
  date: string
  bedtime: string
  wakeTime: string
}

/** "7h 30m of sleep", how that compares with the target, and which days it spans. */
function DurationPreview({ duration, targetMin, date, bedtime, wakeTime }: DurationPreviewProps) {
  if (duration === null || !isDayKey(date)) return null
  const times = resolveSleepTimes(date, bedtime, wakeTime)
  const from = parseLocalDateTime(times.bedtime)
  const to = parseLocalDateTime(times.wakeTime)
  const sameDay = times.bedtime.slice(0, 10) === times.wakeTime.slice(0, 10)
  const diff = duration - targetMin

  return (
    <div aria-live="polite" className="mt-3 px-1">
      <p>
        <span className="tabular font-heading text-xl font-semibold text-sleep">
          {formatDuration(duration)}
        </span>{' '}
        <span className="text-muted-foreground">
          of sleep
          {diff === 0
            ? ', right on target'
            : `, ${formatDuration(Math.abs(diff))} ${diff < 0 ? 'under' : 'over'} target`}
        </span>
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {sameDay
          ? format(from, 'EEE, MMM d')
          : `${format(from, 'EEE')} night into ${format(to, 'EEE, MMM d')}`}
      </p>
    </div>
  )
}
