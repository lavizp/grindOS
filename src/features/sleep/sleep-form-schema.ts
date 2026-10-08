import { z } from 'zod'
import type { ID, Sleep, SleepInput } from '@/db/schema'
import {
  isDayKey,
  resolveSleepTimes,
  sleepDurationMin,
  TIME_OF_DAY_PATTERN,
  todayKey,
  type DayKey,
} from '@/lib/dates'

/** What the form edits. Times are `HH:mm`; `date` is the morning woken up. */
export interface SleepFormValues {
  date: string
  bedtime: string
  wakeTime: string
  quality: number | null
  notes: string
}

export const DEFAULT_BEDTIME = '23:00'
export const DEFAULT_WAKE_TIME = '07:00'

interface SleepFormContext {
  /** Nights already logged, by date. */
  loggedNights: Map<DayKey, ID>
  /** The entry being edited, whose own night doesn't count as taken. */
  editingId?: ID
  today?: DayKey
}

/** Validates form values and converts them to a repository input. */
export function sleepFormSchema({ loggedNights, editingId, today = todayKey() }: SleepFormContext) {
  return z
    .object({
      date: z.string().superRefine((date, ctx) => {
        if (!isDayKey(date)) {
          ctx.addIssue({ code: 'custom', message: 'Pick a date' })
        } else if (date > today) {
          ctx.addIssue({ code: 'custom', message: 'That night hasn’t happened yet' })
        } else {
          const existing = loggedNights.get(date)
          if (existing && existing !== editingId) {
            ctx.addIssue({ code: 'custom', message: 'This night is already logged' })
          }
        }
      }),
      bedtime: z.string().regex(TIME_OF_DAY_PATTERN, 'Pick a bedtime'),
      wakeTime: z.string().regex(TIME_OF_DAY_PATTERN, 'Pick a wake time'),
      quality: z.number().int().min(1).max(5).nullable(),
      notes: z.string().trim().max(2000, 'Keep it under 2000 characters'),
    })
    .refine((v) => !TIME_OF_DAY_PATTERN.test(v.bedtime) || v.bedtime !== v.wakeTime, {
      message: 'Bedtime and wake time can’t be the same',
      path: ['wakeTime'],
    })
    .transform((values): SleepInput => ({
      date: values.date,
      ...resolveSleepTimes(values.date, values.bedtime, values.wakeTime),
      quality: values.quality ?? undefined,
      notes: values.notes || undefined,
    }))
}

/** Minutes of sleep the picked times add up to, or null while they're incomplete. */
export function previewDuration(bedtime: string, wakeTime: string): number | null {
  if (!TIME_OF_DAY_PATTERN.test(bedtime) || !TIME_OF_DAY_PATTERN.test(wakeTime)) return null
  if (bedtime === wakeTime) return null
  // Any wake day works for the length; a fixed one keeps DST out of the preview.
  const times = resolveSleepTimes('2000-01-15', bedtime, wakeTime)
  return sleepDurationMin(times.bedtime, times.wakeTime)
}

/** A new entry for last night, with times copied from the latest one. */
export function emptySleepForm(today = todayKey(), latest?: Sleep): SleepFormValues {
  return {
    date: today,
    bedtime: latest ? latest.bedtime.slice(11) : DEFAULT_BEDTIME,
    wakeTime: latest ? latest.wakeTime.slice(11) : DEFAULT_WAKE_TIME,
    quality: null,
    notes: '',
  }
}

export function sleepToForm(sleep: Sleep): SleepFormValues {
  return {
    date: sleep.date,
    bedtime: sleep.bedtime.slice(11),
    wakeTime: sleep.wakeTime.slice(11),
    quality: sleep.quality ?? null,
    notes: sleep.notes ?? '',
  }
}

/** Every editable field, with absent optionals as explicit `undefined` so an update clears them. */
export function sleepToInput(sleep: Sleep): SleepInput {
  return {
    date: sleep.date,
    bedtime: sleep.bedtime,
    wakeTime: sleep.wakeTime,
    quality: sleep.quality,
    notes: sleep.notes,
  }
}
