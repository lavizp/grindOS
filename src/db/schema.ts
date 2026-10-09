import { z } from 'zod'
import { isDayKey, isLocalDateTime, sleepDurationMin, TIME_OF_DAY_PATTERN } from '@/lib/dates'
import { isSupportedCurrency } from '@/lib/money'

// Shared field schemas

const id = z.string().min(1)
const dayKey = z.string().refine(isDayKey, 'Invalid date')
const localDateTime = z.string().refine(isLocalDateTime, 'Invalid date and time')
const timeOfDay = z.string().regex(TIME_OF_DAY_PATTERN, 'Invalid time')
const requiredText = (max: number) => z.string().trim().min(1, 'Required').max(max)
/** Optional free text; blank strings are stored as undefined. */
const optionalText = (max = 2000) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  )

const meta = {
  id,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
}

export const weightUnitSchema = z.enum(['kg', 'lb'])
export const exerciseKindSchema = z.enum(['weighted', 'bodyweight'])
export const themeSchema = z.enum(['system', 'light', 'dark'])

// Exercises (catalog)

export const exerciseInputSchema = z.object({
  name: requiredText(80),
  kind: exerciseKindSchema,
  archived: z.boolean().optional(),
})

export const exerciseSchema = exerciseInputSchema.extend({
  ...meta,
  /** Lower-cased name, unique-indexed for case-insensitive uniqueness. */
  nameKey: z.string().min(1),
})

// Workouts

export const workoutSetSchema = z.object({
  reps: z.number().int().min(0).max(1000),
  /** Omitted for bodyweight sets. In the workout's `unit`. */
  weight: z.number().min(0).max(2000).optional(),
})

export const workoutEntrySchema = z.object({
  exerciseId: id,
  sets: z.array(workoutSetSchema).min(1),
  notes: optionalText(500),
})

export const workoutInputSchema = z.object({
  date: dayKey,
  name: requiredText(60),
  startTime: timeOfDay.optional(),
  durationMin: z.number().int().min(1).max(1440).optional(),
  unit: weightUnitSchema,
  entries: z.array(workoutEntrySchema),
  notes: optionalText(),
})

export const workoutSchema = workoutInputSchema.extend({
  ...meta,
  /** Denormalized from `entries` for the multiEntry index. */
  exerciseIds: z.array(id),
})

// Workout templates: a saved routine, e.g. "Push" with its exercises and sets

export const templateInputSchema = z.object({
  name: requiredText(60),
  unit: weightUnitSchema,
  entries: z.array(workoutEntrySchema),
})

export const templateSchema = templateInputSchema.extend({
  ...meta,
  /** Lower-cased name, unique-indexed for case-insensitive uniqueness. */
  nameKey: z.string().min(1),
})

// Body weight: at most one entry per day

export const bodyWeightInputSchema = z.object({
  date: dayKey,
  /** In `unit`. */
  weight: z.number().positive('Weight must be greater than 0').max(1000),
  unit: weightUnitSchema,
  notes: optionalText(500),
})

export const bodyWeightSchema = bodyWeightInputSchema.extend(meta)

// Sleep

const sleepFields = z.object({
  /** The morning woken up on, i.e. "last night" belongs to this day. */
  date: dayKey,
  bedtime: localDateTime,
  wakeTime: localDateTime,
  quality: z.number().int().min(1).max(5).optional(),
  notes: optionalText(),
})

type SleepFields = z.infer<typeof sleepFields>

function refineSleep<T extends z.ZodType<SleepFields>>(schema: T) {
  return schema
    .refine(
      (s) => {
        const minutes = sleepDurationMin(s.bedtime, s.wakeTime)
        return minutes > 0 && minutes <= 24 * 60
      },
      { message: 'Wake time must be after bedtime and within 24 hours', path: ['wakeTime'] },
    )
    .refine((s) => s.wakeTime.slice(0, 10) === s.date, {
      message: 'Date must be the day you woke up',
      path: ['date'],
    })
}

export const sleepInputSchema = refineSleep(sleepFields)
export const sleepSchema = refineSleep(sleepFields.extend(meta))

// Spending

export const categoryInputSchema = z.object({
  name: requiredText(40),
  /** lucide-react icon name in kebab-case, e.g. "utensils". */
  icon: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Invalid color'),
  order: z.number().int().min(0),
  archived: z.boolean().optional(),
})

export const categorySchema = categoryInputSchema.extend(meta)

export const paymentInputSchema = z.object({
  date: dayKey,
  amountMinor: z
    .number()
    .int()
    .positive('Amount must be greater than 0')
    .max(Number.MAX_SAFE_INTEGER),
  categoryId: id,
  /** Description or merchant. Optional so a payment can be logged with amount + category alone. */
  merchant: optionalText(120),
  notes: optionalText(),
})

export const paymentSchema = paymentInputSchema.extend(meta)

// Settings

export const SETTINGS_ID = 'app'

export const settingsSchema = z.object({
  id: z.literal(SETTINGS_ID),
  currency: z.string().refine(isSupportedCurrency, 'Unsupported currency'),
  weightUnit: weightUnitSchema,
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  theme: themeSchema,
  sleepTargetMin: z.number().int().min(60).max(1440),
  lastBackupAt: z.number().int().nonnegative().optional(),
  /** When the first-run welcome was completed. */
  onboardedAt: z.number().int().nonnegative().optional(),
})

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  currency: 'NPR',
  weightUnit: 'kg',
  weekStartsOn: 0,
  theme: 'system',
  sleepTargetMin: 480,
}

// Types

export type ID = string
export type Meta = { id: ID; createdAt: number; updatedAt: number }
export type WeightUnit = z.infer<typeof weightUnitSchema>
export type ExerciseKind = z.infer<typeof exerciseKindSchema>
export type Theme = z.infer<typeof themeSchema>

export type Exercise = z.infer<typeof exerciseSchema>
export type ExerciseInput = z.input<typeof exerciseInputSchema>
export type WorkoutSet = z.infer<typeof workoutSetSchema>
export type WorkoutEntry = z.infer<typeof workoutEntrySchema>
export type Workout = z.infer<typeof workoutSchema>
export type WorkoutInput = z.input<typeof workoutInputSchema>
export type WorkoutTemplate = z.infer<typeof templateSchema>
export type WorkoutTemplateInput = z.input<typeof templateInputSchema>
export type BodyWeight = z.infer<typeof bodyWeightSchema>
export type BodyWeightInput = z.input<typeof bodyWeightInputSchema>
export type Sleep = z.infer<typeof sleepSchema>
export type SleepInput = z.input<typeof sleepInputSchema>
export type Category = z.infer<typeof categorySchema>
export type CategoryInput = z.input<typeof categoryInputSchema>
export type Payment = z.infer<typeof paymentSchema>
export type PaymentInput = z.input<typeof paymentInputSchema>
export type Settings = z.infer<typeof settingsSchema>
