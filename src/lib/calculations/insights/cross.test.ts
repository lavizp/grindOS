import { lateWorkouts, sleepAfterWorkouts } from '@/lib/calculations/insights/cross'
import { addDaysToKey } from '@/lib/dates'
import { context, days, nightOf, workout } from '@/test/insight-fixtures'

const today = '2026-10-22'
/** The day before a night: the workout that night follows. */
const dayBefore = (wakeDay: string) => addDaysToKey(wakeDay, -1)

describe('sleepAfterWorkouts', () => {
  it('compares nights after training with nights after rest', () => {
    const wakeDays = days(today, 12)
    const trained = wakeDays.filter((_, i) => i % 2 === 0)
    const sleep = wakeDays.map((d) => nightOf(d, trained.includes(d) ? 450 : 480))
    const workouts = trained.map((d) => workout(dayBefore(d)))
    expect(sleepAfterWorkouts(context(today, { sleep, workouts }))).toMatchObject([
      {
        domain: 'cross',
        title: 'You sleep 30m less after workout days',
        detail: '7h 30m after training (6 nights), 8h after rest days (6 nights).',
      },
    ])
  })

  it('needs five nights on each side and a clear difference', () => {
    const wakeDays = days(today, 9)
    const trained = wakeDays.slice(0, 4)
    const sleep = wakeDays.map((d) => nightOf(d, trained.includes(d) ? 400 : 480))
    const workouts = trained.map((d) => workout(dayBefore(d)))
    expect(sleepAfterWorkouts(context(today, { sleep, workouts }))).toEqual([])

    const even = days(today, 12).map((d) => nightOf(d, 470))
    const some = days(today, 12)
      .filter((_, i) => i % 2 === 0)
      .map((d) => workout(dayBefore(d)))
    expect(sleepAfterWorkouts(context(today, { sleep: even, workouts: some }))).toEqual([])
    expect(sleepAfterWorkouts(context(today, { sleep: even }))).toEqual([])
  })
})

describe('lateWorkouts', () => {
  const wakeDays = days(today, 10)
  const late = wakeDays.slice(0, 5)

  it('compares nights after late workouts with nights after earlier ones', () => {
    const sleep = wakeDays.map((d) => nightOf(d, late.includes(d) ? 420 : 480))
    const workouts = wakeDays.map((d) =>
      workout(dayBefore(d), [], late.includes(d) ? '20:30' : '07:00'),
    )
    expect(lateWorkouts(context(today, { sleep, workouts }))).toMatchObject([
      {
        severity: 'warning',
        title: 'You sleep 1h less after late workouts',
        detail: '7h after workouts from 8 PM (5 nights), 8h after earlier ones (5 nights).',
      },
    ])
  })

  it('leaves out days whose workouts have no start time', () => {
    const sleep = wakeDays.map((d) => nightOf(d, late.includes(d) ? 420 : 480))
    const workouts = wakeDays.map((d, i) =>
      workout(dayBefore(d), [], i === 0 ? undefined : late.includes(d) ? '20:30' : '07:00'),
    )
    // Only four late nights remain: not enough.
    expect(lateWorkouts(context(today, { sleep, workouts }))).toEqual([])
  })
})
