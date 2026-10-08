import type { Workout } from '@/db/schema'
import {
  copySets,
  emptyWorkoutForm,
  hasProgress,
  parseNumberInput,
  repeatEntries,
  workoutFormSchema,
  workoutToForm,
  type WorkoutFormValues,
} from '@/features/workouts/workout-form-schema'

const today = '2026-10-08'
const values = (overrides: Partial<WorkoutFormValues> = {}): WorkoutFormValues => ({
  name: 'Push',
  date: today,
  startTime: '18:30',
  durationMin: '',
  notes: '',
  entries: [
    {
      exerciseId: 'ex_bench_press',
      sets: [
        { reps: '8', weight: '60' },
        { reps: '6', weight: '62,5' },
      ],
    },
    { exerciseId: 'ex_dips', sets: [{ reps: '12', weight: '' }] },
  ],
  ...overrides,
})

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((i) => i.message) ?? []
}

describe('parseNumberInput', () => {
  it('accepts plain numbers with either decimal mark', () => {
    expect(parseNumberInput('8')).toBe(8)
    expect(parseNumberInput(' 62.5 ')).toBe(62.5)
    expect(parseNumberInput('62,5')).toBe(62.5)
  })

  it('rejects anything else', () => {
    for (const input of ['', '-5', '1e3', '6.', 'abc', '1,000.5']) {
      expect(parseNumberInput(input)).toBeNull()
    }
  })
})

describe('workoutFormSchema', () => {
  const schema = workoutFormSchema({ unit: 'kg', today })

  it('converts sets and drops empty optionals', () => {
    expect(schema.parse(values())).toEqual({
      name: 'Push',
      date: today,
      startTime: '18:30',
      durationMin: undefined,
      notes: undefined,
      unit: 'kg',
      entries: [
        {
          exerciseId: 'ex_bench_press',
          sets: [
            { reps: 8, weight: 60 },
            { reps: 6, weight: 62.5 },
          ],
        },
        { exerciseId: 'ex_dips', sets: [{ reps: 12 }] },
      ],
    })
  })

  it('allows a workout without exercises, e.g. a run', () => {
    expect(
      schema.parse(values({ name: 'Run', entries: [], durationMin: '35', startTime: '' })),
    ).toMatchObject({ name: 'Run', entries: [], durationMin: 35, startTime: undefined })
  })

  it('reports every bad field at once', () => {
    const result = schema.safeParse(
      values({
        name: ' ',
        date: '2026-10-09',
        durationMin: '1.5',
        entries: [
          {
            exerciseId: 'ex_bench_press',
            sets: [
              { reps: '', weight: '60' },
              { reps: '8.5', weight: 'heavy' },
            ],
          },
        ],
      }),
    )
    expect(messages(result)).toEqual([
      'Name the workout',
      'Pick today or earlier',
      'Enter minutes, from 1 to 1440',
      'Enter reps',
      'Reps must be a whole number',
      'Enter a valid weight',
    ])
  })

  it('needs at least one set per exercise', () => {
    const result = schema.safeParse(values({ entries: [{ exerciseId: 'ex_dips', sets: [] }] }))
    expect(messages(result)).toEqual(['Add a set'])
  })
})

describe('repeating and copying', () => {
  const previous: Workout = {
    id: 'w1',
    date: '2026-10-01',
    name: 'Push',
    unit: 'lb',
    entries: [
      { exerciseId: 'ex_bench_press', sets: [{ reps: 5, weight: 135 }] },
      { exerciseId: 'ex_dips', sets: [{ reps: 10 }, { reps: 8 }] },
    ],
    exerciseIds: ['ex_bench_press', 'ex_dips'],
    createdAt: 1,
    updatedAt: 1,
  }

  it('repeats exercises and sets, converting units to the nearest 0.25', () => {
    expect(repeatEntries(previous, 'kg')).toEqual([
      { exerciseId: 'ex_bench_press', sets: [{ reps: '5', weight: '61.25' }] },
      {
        exerciseId: 'ex_dips',
        sets: [
          { reps: '10', weight: '' },
          { reps: '8', weight: '' },
        ],
      },
    ])
    expect(copySets(previous.entries[0].sets, 'lb', 'lb')).toEqual([{ reps: '5', weight: '135' }])
  })

  it('round-trips a workout through the form', () => {
    const schema = workoutFormSchema({ unit: 'lb', today })
    expect(schema.parse(workoutToForm(previous))).toMatchObject({
      name: 'Push',
      unit: 'lb',
      entries: previous.entries,
    })
  })
})

describe('drafts', () => {
  it('starts today at the current time', () => {
    expect(emptyWorkoutForm(new Date(2026, 9, 8, 7, 5))).toMatchObject({
      date: today,
      startTime: '07:05',
      entries: [],
    })
  })

  it('only keeps a draft once something is entered', () => {
    const empty = emptyWorkoutForm()
    expect(hasProgress(empty)).toBe(false)
    expect(hasProgress({ ...empty, name: 'Legs' })).toBe(true)
    expect(hasProgress({ ...empty, entries: values().entries })).toBe(true)
  })
})
