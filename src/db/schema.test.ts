import {
  paymentInputSchema,
  settingsSchema,
  sleepInputSchema,
  workoutInputSchema,
} from '@/db/schema'
import { DEFAULT_SETTINGS } from '@/db/schema'

describe('paymentInputSchema', () => {
  const valid = { date: '2026-10-07', amountMinor: 25000, categoryId: 'cat_food' }

  it('accepts a minimal payment', () => {
    expect(paymentInputSchema.parse(valid)).toEqual(valid)
  })

  it('trims text and turns blank text into undefined', () => {
    const parsed = paymentInputSchema.parse({ ...valid, merchant: '  Bhatbhateni ', notes: '   ' })
    expect(parsed.merchant).toBe('Bhatbhateni')
    expect(parsed.notes).toBeUndefined()
  })

  it('rejects non-positive and fractional amounts', () => {
    expect(paymentInputSchema.safeParse({ ...valid, amountMinor: 0 }).success).toBe(false)
    expect(paymentInputSchema.safeParse({ ...valid, amountMinor: 12.5 }).success).toBe(false)
  })

  it('rejects invalid dates', () => {
    expect(paymentInputSchema.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false)
  })
})

describe('sleepInputSchema', () => {
  const valid = { date: '2026-10-07', bedtime: '2026-10-06T23:30', wakeTime: '2026-10-07T07:00' }

  it('accepts a normal night', () => {
    expect(sleepInputSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects waking before bedtime', () => {
    const result = sleepInputSchema.safeParse({ ...valid, bedtime: '2026-10-07T08:00' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['wakeTime'])
  })

  it('rejects sleep longer than 24 hours', () => {
    expect(sleepInputSchema.safeParse({ ...valid, bedtime: '2026-10-05T23:30' }).success).toBe(
      false,
    )
  })

  it('requires the date to be the wake-up day', () => {
    const result = sleepInputSchema.safeParse({ ...valid, date: '2026-10-06' })
    expect(result.error?.issues[0]?.path).toEqual(['date'])
  })

  it('validates quality range', () => {
    expect(sleepInputSchema.safeParse({ ...valid, quality: 6 }).success).toBe(false)
  })
})

describe('workoutInputSchema', () => {
  const valid = { date: '2026-10-07', name: 'Push', unit: 'kg' as const, entries: [] }

  it('allows a workout without exercises (e.g. a run)', () => {
    expect(workoutInputSchema.safeParse(valid).success).toBe(true)
  })

  it('requires at least one set per exercise', () => {
    const result = workoutInputSchema.safeParse({
      ...valid,
      entries: [{ exerciseId: 'ex_bench_press', sets: [] }],
    })
    expect(result.success).toBe(false)
  })

  it('validates start time', () => {
    expect(workoutInputSchema.safeParse({ ...valid, startTime: '25:00' }).success).toBe(false)
    expect(workoutInputSchema.safeParse({ ...valid, startTime: '18:30' }).success).toBe(true)
  })
})

describe('settingsSchema', () => {
  it('accepts the defaults', () => {
    expect(settingsSchema.parse(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.currency).toBe('NPR')
  })

  it('rejects unknown currencies', () => {
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, currency: 'ZZZ' }).success).toBe(false)
  })
})
