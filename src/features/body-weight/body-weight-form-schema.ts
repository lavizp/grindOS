import { z } from 'zod'
import type { BodyWeight, BodyWeightInput, ID, WeightUnit } from '@/db/schema'
import { parseNumberInput } from '@/features/workouts/workout-form-schema'
import { isDayKey, todayKey, type DayKey } from '@/lib/dates'

/** What the form edits: strings, as typed. */
export interface BodyWeightFormValues {
  date: string
  weight: string
  notes: string
}

interface SchemaOptions {
  unit: WeightUnit
  /** Every logged day and its entry id: there's one weigh-in per day. */
  loggedDays: Map<DayKey, ID>
  editingId?: ID
  today?: DayKey
}

/** Validates form values and converts them to a repository input. */
export function bodyWeightFormSchema({
  unit,
  loggedDays,
  editingId,
  today = todayKey(),
}: SchemaOptions) {
  return z
    .object({
      date: z.string().superRefine((date, ctx) => {
        if (!isDayKey(date)) ctx.addIssue({ code: 'custom', message: 'Pick a date' })
        else if (date > today) ctx.addIssue({ code: 'custom', message: 'Pick today or earlier' })
        else {
          const existing = loggedDays.get(date)
          if (existing && existing !== editingId) {
            ctx.addIssue({ code: 'custom', message: 'This day is already logged' })
          }
        }
      }),
      weight: z.string().superRefine((value, ctx) => {
        const weight = parseNumberInput(value)
        if (value.trim() === '') ctx.addIssue({ code: 'custom', message: 'Enter your weight' })
        else if (weight === null || weight <= 0 || weight > 1000) {
          ctx.addIssue({ code: 'custom', message: 'Enter a valid weight' })
        }
      }),
      notes: z.string().trim().max(500, 'Keep it under 500 characters'),
    })
    .transform((values): BodyWeightInput => ({
      date: values.date,
      weight: parseNumberInput(values.weight)!,
      unit,
      notes: values.notes || undefined,
    }))
}

export function emptyBodyWeightForm(today: DayKey = todayKey()): BodyWeightFormValues {
  return { date: today, weight: '', notes: '' }
}

export function bodyWeightToForm(entry: BodyWeight): BodyWeightFormValues {
  return { date: entry.date, weight: String(entry.weight), notes: entry.notes ?? '' }
}

/** Every editable field, with absent optionals as explicit `undefined` so an update clears them. */
export function bodyWeightToInput(entry: BodyWeight): BodyWeightInput {
  return { date: entry.date, weight: entry.weight, unit: entry.unit, notes: entry.notes }
}
