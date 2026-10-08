import type { WeightUnit, Workout, WorkoutEntry } from '@/db/schema'
import {
  convertWeight,
  countSets,
  estimateOneRepMax,
  findNewRecords,
  getDailyCounts,
  getExerciseProgress,
  getPersonalRecords,
  getStreak,
  getTopExercises,
  getVolume,
  getWeeklyCounts,
  getWorkoutFrequency,
} from '@/lib/calculations/workouts'

let seq = 0
function workout(
  date: string,
  entries: WorkoutEntry[] = [],
  extra: Partial<Workout> & { unit?: WeightUnit } = {},
): Workout {
  seq += 1
  return {
    id: `w${seq}`,
    date,
    name: 'Push',
    unit: 'kg',
    entries,
    exerciseIds: [...new Set(entries.map((e) => e.exerciseId))],
    createdAt: seq,
    updatedAt: seq,
    ...extra,
  }
}

const bench = (...sets: Array<[reps: number, weight?: number]>): WorkoutEntry => ({
  exerciseId: 'bench',
  sets: sets.map(([reps, weight]) => (weight === undefined ? { reps } : { reps, weight })),
})
const dips = (...reps: number[]): WorkoutEntry => ({
  exerciseId: 'dips',
  sets: reps.map((r) => ({ reps: r })),
})

describe('estimateOneRepMax', () => {
  it('uses Epley', () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 2)
    expect(estimateOneRepMax(60, 5)).toBe(70)
  })

  it('treats a single as its own max and zero reps as nothing', () => {
    expect(estimateOneRepMax(140, 1)).toBe(140)
    expect(estimateOneRepMax(140, 0)).toBe(0)
    expect(estimateOneRepMax(0, 10)).toBe(0)
  })
})

describe('convertWeight', () => {
  it('converts between kg and lb', () => {
    expect(convertWeight(100, 'kg', 'lb')).toBeCloseTo(220.46, 2)
    expect(convertWeight(225, 'lb', 'kg')).toBeCloseTo(102.06, 2)
    expect(convertWeight(60, 'kg', 'kg')).toBe(60)
  })
})

describe('getVolume', () => {
  it('sums reps × weight, skipping bodyweight sets, in one unit', () => {
    const rows = [
      workout('2026-10-05', [bench([8, 60], [8, 60]), dips(12)]),
      workout('2026-10-06', [bench([5, 100])], { unit: 'lb' }),
    ]
    expect(getVolume(rows.slice(0, 1), 'kg')).toBe(960)
    expect(getVolume(rows, 'kg', 'bench')).toBeCloseTo(960 + 500 / 2.2046226218, 5)
    expect(getVolume(rows, 'kg', 'dips')).toBe(0)
  })
})

describe('frequency and counts', () => {
  const rows = [
    workout('2026-10-04', [bench([5, 60])], { durationMin: 45 }),
    workout('2026-10-04', [dips(10)]),
    workout('2026-10-07', [], { name: 'Run', durationMin: 30 }),
    workout('2026-09-20', [bench([5, 60])]),
  ]
  const week = { start: '2026-10-04', end: '2026-10-10' }

  it('counts workouts, active days and time in a range', () => {
    expect(getWorkoutFrequency(rows, week)).toEqual({
      workouts: 3,
      activeDays: 2,
      totalMinutes: 75,
    })
  })

  it('counts per day and per set', () => {
    expect(getDailyCounts(rows)).toEqual({ '2026-10-04': 2, '2026-10-07': 1, '2026-09-20': 1 })
    expect(countSets(workout('2026-10-04', [bench([5, 60], [5, 60]), dips(10)]))).toBe(3)
  })

  it('counts per week, oldest first, including empty weeks', () => {
    expect(getWeeklyCounts(rows, '2026-10-08', 0, 4)).toEqual([
      { weekStart: '2026-09-13', count: 0 },
      { weekStart: '2026-09-20', count: 1 },
      { weekStart: '2026-09-27', count: 0 },
      { weekStart: '2026-10-04', count: 3 },
    ])
  })
})

describe('getStreak', () => {
  // Weeks start on Monday here: Sep 28, Oct 5, Oct 12.
  const rows = [
    workout('2026-09-21'),
    workout('2026-09-30'),
    workout('2026-10-04'), // Sunday, the last day of the week of Sep 28
    workout('2026-10-05'), // Monday, a new week
  ]

  it('counts consecutive weeks across week boundaries', () => {
    expect(getStreak(rows, '2026-10-08', 1)).toBe(3)
  })

  it('doesn’t break while this week has no workout yet', () => {
    expect(getStreak(rows.slice(0, 3), '2026-10-08', 1)).toBe(2)
  })

  it('breaks after a full week without a workout', () => {
    expect(getStreak(rows, '2026-10-20', 1)).toBe(0)
    expect(getStreak([], '2026-10-08', 1)).toBe(0)
  })

  it('depends on the week start', () => {
    // With Sunday starts, Oct 4 and Oct 5 fall in the same week.
    expect(getStreak(rows, '2026-10-08', 0)).toBe(3)
    expect(getStreak([workout('2026-10-04'), workout('2026-10-03')], '2026-10-08', 0)).toBe(2)
    expect(getStreak([workout('2026-10-04'), workout('2026-10-03')], '2026-10-08', 1)).toBe(1)
  })

  it('ignores future workouts', () => {
    expect(getStreak([workout('2026-10-20')], '2026-10-08', 1)).toBe(0)
  })
})

describe('getTopExercises', () => {
  it('ranks by sessions, then sets', () => {
    const rows = [
      workout('2026-10-01', [bench([5, 60]), dips(10, 10, 10)]),
      workout('2026-10-03', [bench([5, 60], [5, 60]), bench([3, 70])]),
      workout('2026-10-05', [dips(8)]),
    ]
    expect(getTopExercises(rows)).toEqual([
      { exerciseId: 'dips', sessions: 2, sets: 4, lastDate: '2026-10-05' },
      { exerciseId: 'bench', sessions: 2, sets: 4, lastDate: '2026-10-03' },
    ])
    expect(getTopExercises(rows, 1, { start: '2026-10-02', end: '2026-10-04' })).toEqual([
      { exerciseId: 'bench', sessions: 1, sets: 3, lastDate: '2026-10-03' },
    ])
  })
})

describe('getExerciseProgress', () => {
  it('gives the top set, e1RM and volume per session, oldest first', () => {
    const rows = [
      workout('2026-10-05', [bench([8, 60], [6, 65], [10, 50])]),
      workout('2026-10-01', [bench([5, 60]), dips(10)]),
      workout('2026-10-03', [dips(12)]),
    ]
    const progress = getExerciseProgress(rows, 'bench', 'kg')
    expect(progress.map((p) => p.date)).toEqual(['2026-10-01', '2026-10-05'])
    expect(progress[1]).toMatchObject({
      topWeight: 65,
      topReps: 6,
      volume: 480 + 390 + 500,
      totalReps: 24,
    })
    expect(progress[1].bestE1rm).toBeCloseTo(78, 5) // 65 × (1 + 6/30)
  })

  it('handles bodyweight-only sessions', () => {
    const [session] = getExerciseProgress([workout('2026-10-03', [dips(12, 10)])], 'dips', 'kg')
    expect(session).toMatchObject({ topWeight: null, topReps: 12, bestE1rm: null, volume: 0 })
  })

  it('converts sessions logged in another unit', () => {
    const rows = [workout('2026-10-01', [bench([5, 225])], { unit: 'lb' })]
    expect(getExerciseProgress(rows, 'bench', 'kg')[0].topWeight).toBeCloseTo(102.06, 2)
  })
})

describe('getPersonalRecords', () => {
  const rows = [
    workout('2026-09-01', [bench([10, 60], [8, 70])]),
    workout('2026-09-08', [bench([3, 80], [12, 60])]),
    workout('2026-09-15', [bench([3, 80])]),
  ]

  it('finds the heaviest set, best e1RM and most reps', () => {
    const records = getPersonalRecords(rows, 'bench', 'kg')
    expect(records.heaviest).toMatchObject({ weight: 80, reps: 3, date: '2026-09-08' })
    // 70 × 8 → 88.7 edges out 80 × 3 → 88 and 60 × 12 → 84.
    expect(records.bestE1rm).toMatchObject({ weight: 70, reps: 8, date: '2026-09-01' })
    expect(records.bestE1rm?.e1rm).toBeCloseTo(88.67, 2)
    expect(records.mostReps).toMatchObject({ reps: 12, weight: 60, date: '2026-09-08' })
  })

  it('keeps the first time a record was set', () => {
    // The Sep 15 set ties the heaviest; the record still dates from Sep 8.
    expect(getPersonalRecords(rows, 'bench', 'kg').heaviest?.date).toBe('2026-09-08')
  })

  it('lists the most reps at each weight, heaviest first', () => {
    expect(
      getPersonalRecords(rows, 'bench', 'kg').repsByWeight.map((r) => [r.weight, r.reps]),
    ).toEqual([
      [80, 3],
      [70, 8],
      [60, 12],
    ])
  })

  it('has only rep records for bodyweight exercises, and nothing for unknown ones', () => {
    const records = getPersonalRecords([workout('2026-10-01', [dips(15, 12)])], 'dips', 'kg')
    expect(records).toMatchObject({ heaviest: null, bestE1rm: null, repsByWeight: [] })
    expect(records.mostReps?.reps).toBe(15)
    expect(getPersonalRecords(rows, 'squat', 'kg').mostReps).toBeNull()
  })
})

describe('findNewRecords', () => {
  const history = [
    workout('2026-09-01', [bench([5, 80]), dips(12)]),
    workout('2026-09-08', [bench([8, 70])]),
  ]

  it('detects a heavier set and a better e1RM', () => {
    const today = workout('2026-10-01', [bench([3, 85]), dips(10)])
    expect(findNewRecords(today, [...history, today])).toEqual([
      { exerciseId: 'bench', kinds: ['heaviest', 'e1rm'] },
    ])
  })

  it('detects an e1RM record without a heavier set', () => {
    // 75 × 8 → 95 beats 80 × 5 → 93.3, at a lighter weight.
    const today = workout('2026-10-01', [bench([8, 75])])
    expect(findNewRecords(today, history)).toEqual([{ exerciseId: 'bench', kinds: ['e1rm'] }])
  })

  it('detects rep records for bodyweight exercises', () => {
    const today = workout('2026-10-01', [dips(15)])
    expect(findNewRecords(today, history)).toEqual([{ exerciseId: 'dips', kinds: ['reps'] }])
  })

  it('doesn’t count a first attempt, an equal effort, or later workouts', () => {
    const first = workout('2026-10-01', [{ exerciseId: 'squat', sets: [{ reps: 5, weight: 100 }] }])
    expect(findNewRecords(first, history)).toEqual([])
    expect(findNewRecords(workout('2026-10-01', [bench([5, 80])]), history)).toEqual([])
    // Editing an old workout compares it only with what came before it.
    const later = workout('2026-11-01', [bench([1, 200])])
    const old = workout('2026-09-05', [bench([5, 82])])
    expect(findNewRecords(old, [...history, later])).toEqual([
      { exerciseId: 'bench', kinds: ['heaviest', 'e1rm'] },
    ])
  })
})
