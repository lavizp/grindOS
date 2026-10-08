import {
  neglectedExercise,
  newRecords,
  streak,
  weeklyCount,
} from '@/lib/calculations/insights/workouts'
import { addDaysToKey } from '@/lib/dates'
import { context, sets, workout } from '@/test/insight-fixtures'

// Thursday. With Sunday week starts, this week is Oct 18–24.
const today = '2026-10-22'

/** Three workouts in each of the four weeks before this one: usually 3. */
const usualWeeks = [0, 1, 2, 3].flatMap((week) =>
  [0, 2, 4].map((day) => workout(addDaysToKey('2026-09-20', week * 7 + day))),
)
const thisWeek = (count: number) =>
  ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'].slice(0, count).map((d) => workout(d))

describe('weeklyCount', () => {
  it('notices beating or matching the usual week', () => {
    expect(
      weeklyCount(context(today, { workouts: [...usualWeeks, ...thisWeek(4)] })),
    ).toMatchObject([{ id: 'workouts-week-ahead', title: '4 workouts this week, more than usual' }])
    expect(
      weeklyCount(context(today, { workouts: [...usualWeeks, ...thisWeek(3)] })),
    ).toMatchObject([
      { id: 'workouts-week-done', title: 'You’ve done your usual 3 workouts a week' },
    ])
  })

  it('points out falling behind, late enough in the week', () => {
    expect(
      weeklyCount(context(today, { workouts: [...usualWeeks, ...thisWeek(1)] })),
    ).toMatchObject([
      {
        id: 'workouts-week-behind',
        title: '1 workout so far this week',
        detail: 'You usually do 3. 3 days left.',
      },
    ])
    // Monday: too early to say.
    expect(weeklyCount(context('2026-10-19', { workouts: usualWeeks }))).toEqual([])
  })

  it('needs some history', () => {
    expect(weeklyCount(context(today, { workouts: thisWeek(2) }))).toEqual([])
  })
})

describe('streak', () => {
  it('celebrates three or more weeks in a row', () => {
    const workouts = ['2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20'].map((d) => workout(d))
    expect(streak(context(today, { workouts }))).toMatchObject([
      { title: '4-week workout streak', detail: 'You’ve trained every week since Sep 27.' },
    ])
    expect(streak(context(today, { workouts: workouts.slice(2) }))).toEqual([])
  })
})

describe('newRecords', () => {
  const history = [workout('2026-10-01', [sets('bench', [5, 80]), sets('dips', [12])])]

  it('reports a record from the last week', () => {
    const recent = workout('2026-10-21', [sets('bench', [5, 85]), sets('dips', [10])])
    expect(newRecords(context(today, { workouts: [...history, recent] }))).toMatchObject([
      {
        title: 'New record on Bench Press',
        detail: '85 kg × 5 yesterday.',
        link: '/workouts/exercises/bench',
      },
    ])
  })

  it('combines several records', () => {
    const recent = workout('2026-10-19', [sets('bench', [6, 80]), sets('dips', [15])])
    expect(newRecords(context(today, { workouts: [...history, recent] }))).toMatchObject([
      { title: 'New records on Bench Press and Dips', link: '/workouts' },
    ])
  })

  it('ignores older records and first attempts', () => {
    const old = workout('2026-10-10', [sets('bench', [5, 90])])
    expect(newRecords(context(today, { workouts: [...history, old] }))).toEqual([])
    const first = workout('2026-10-21', [sets('squat', [5, 100])])
    expect(newRecords(context(today, { workouts: [...history, first] }))).toEqual([])
  })
})

describe('neglectedExercise', () => {
  const squats = ['2026-09-01', '2026-09-08', '2026-09-15'].map((d) =>
    workout(d, [sets('squat', [5, 100])]),
  )

  it('points out a regular exercise that’s been skipped for a while', () => {
    expect(neglectedExercise(context(today, { workouts: squats }))).toMatchObject([
      {
        title: 'No Squat in 5 weeks',
        detail: 'You did it 3 times in the last three months, last on Sep 15.',
        link: '/workouts/exercises/squat',
      },
    ])
  })

  it('ignores occasional exercises and recent ones', () => {
    expect(neglectedExercise(context(today, { workouts: squats.slice(1) }))).toEqual([])
    const recent = [...squats, workout('2026-10-12', [sets('squat', [5, 100])])]
    expect(neglectedExercise(context(today, { workouts: recent }))).toEqual([])
  })
})
