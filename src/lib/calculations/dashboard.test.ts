import type { Payment, Workout } from '@/db/schema'
import {
  daysSinceBackup,
  getTypicalDailySpending,
  getUsualWeeklyWorkouts,
  needsBackup,
} from '@/lib/calculations/dashboard'

let seq = 0
function workout(date: string): Workout {
  seq += 1
  return {
    id: `w${seq}`,
    date,
    name: 'Push',
    unit: 'kg',
    entries: [],
    exerciseIds: [],
    createdAt: seq,
    updatedAt: seq,
  }
}

function pay(date: string, amountMinor: number): Payment {
  seq += 1
  return {
    id: `p${seq}`,
    date,
    amountMinor,
    categoryId: 'cat_food',
    createdAt: seq,
    updatedAt: seq,
  }
}

// Thursday; with Sunday week starts this week began Oct 4.
const today = '2026-10-08'

describe('getUsualWeeklyWorkouts', () => {
  it('averages the four full weeks before this one', () => {
    const rows = [
      workout('2026-09-07'), // week of Sep 6
      workout('2026-09-09'),
      workout('2026-09-14'), // week of Sep 13
      workout('2026-09-16'),
      workout('2026-09-18'),
      workout('2026-09-22'), // week of Sep 20
      workout('2026-09-29'), // week of Sep 27
      workout('2026-09-30'),
      workout('2026-10-05'), // this week: not part of the usual
      workout('2026-10-06'),
      workout('2026-10-07'),
      workout('2026-10-08'),
      workout('2026-08-30'), // five weeks back: too old
    ]
    // (2 + 3 + 1 + 2) / 4 = 2
    expect(getUsualWeeklyWorkouts(rows, today, 0)).toBe(2)
  })

  it('counts empty weeks, and is null without any history', () => {
    expect(getUsualWeeklyWorkouts([workout('2026-09-29'), workout('2026-09-30')], today, 0)).toBe(1)
    expect(getUsualWeeklyWorkouts([workout(today)], today, 0)).toBeNull()
    expect(getUsualWeeklyWorkouts([], today, 0)).toBeNull()
  })
})

describe('getTypicalDailySpending', () => {
  it('averages the previous 30 days, leaving today out', () => {
    const rows = [
      pay('2026-10-07', 30000),
      pay('2026-09-08', 60000), // the first of the 30 days
      pay('2026-09-07', 99999), // too old
      pay(today, 99999), // today isn't over
    ]
    expect(getTypicalDailySpending(rows, today)).toBe(3000)
  })

  it('is null with no spending to compare against', () => {
    expect(getTypicalDailySpending([pay(today, 500)], today)).toBeNull()
  })
})

describe('backup reminders', () => {
  const now = new Date(2026, 9, 8, 9, 0)
  const daysAgo = (days: number) => new Date(2026, 9, 8 - days, 20, 0).getTime()

  it('waits until there is something to back up', () => {
    expect(needsBackup(undefined, null, now)).toBe(false)
  })

  it('counts from the first entry when there has never been a backup', () => {
    expect(needsBackup(undefined, '2026-09-24', now)).toBe(false) // 14 days
    expect(needsBackup(undefined, '2026-09-23', now)).toBe(true) // 15 days
  })

  it('counts from the last backup otherwise', () => {
    expect(needsBackup(daysAgo(14), '2026-01-01', now)).toBe(false)
    expect(needsBackup(daysAgo(15), '2026-01-01', now)).toBe(true)
  })

  it('reports days since the last backup', () => {
    expect(daysSinceBackup(daysAgo(20), now)).toBe(20)
    expect(daysSinceBackup(undefined, now)).toBeNull()
  })
})
