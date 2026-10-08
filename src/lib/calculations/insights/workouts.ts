import { format } from 'date-fns'
import { getUsualWeeklyWorkouts } from '@/lib/calculations/dashboard'
import {
  findNewRecords,
  getPersonalRecords,
  getStreak,
  getTopExercises,
} from '@/lib/calculations/workouts'
import { addDaysToKey, daysBetween, isInRange, parseDayKey, weekRange } from '@/lib/dates'
import { formatWeight } from '@/lib/formatters'
import { joinNames, plural } from '@/lib/calculations/insights/helpers'
import type { InsightRule } from '@/lib/calculations/insights/types'

/** Weeks in a row before a streak is worth celebrating. */
export const STREAK_MIN_WEEKS = 3
const RECORD_DAYS = 7
/** Gaps shorter than this aren't "neglect". */
export const NEGLECT_DAYS = 14
const NEGLECT_HISTORY_DAYS = 90
const NEGLECT_MIN_SESSIONS = 3
/** Days into the week before pointing out you're behind. */
const BEHIND_AFTER_DAYS = 4

/** This week's count against your usual week. */
export const weeklyCount: InsightRule = ({ data, today, settings }) => {
  const usual = getUsualWeeklyWorkouts(data.workouts, today, settings.weekStartsOn)
  if (usual === null || usual === 0) return []
  const week = weekRange(today, settings.weekStartsOn)
  const count = data.workouts.filter((w) => isInRange(w.date, week)).length
  const usualText = `your usual ${plural(usual, 'workout')} a week`

  if (count > usual) {
    return [
      {
        id: 'workouts-week-ahead',
        domain: 'workout',
        severity: 'positive',
        priority: 55,
        title: `${plural(count, 'workout')} this week, more than usual`,
        detail: `You’ve already passed ${usualText}.`,
        link: '/workouts',
      },
    ]
  }
  if (count === usual) {
    return [
      {
        id: 'workouts-week-done',
        domain: 'workout',
        severity: 'positive',
        priority: 50,
        title: `You’ve done ${usualText}`,
        detail: `${plural(count, 'workout')} so far this week.`,
        link: '/workouts',
      },
    ]
  }
  if (daysBetween(week.start, today) + 1 < BEHIND_AFTER_DAYS) return []
  return [
    {
      id: 'workouts-week-behind',
      domain: 'workout',
      severity: 'neutral',
      priority: 55,
      title: `${plural(count, 'workout')} so far this week`,
      detail: `You usually do ${usual}. ${plural(daysBetween(today, week.end) + 1, 'day')} left.`,
      link: '/workouts',
    },
  ]
}

export const streak: InsightRule = ({ data, today, settings }) => {
  const weeks = getStreak(data.workouts, today, settings.weekStartsOn)
  if (weeks < STREAK_MIN_WEEKS) return []
  const since = addDaysToKey(weekRange(today, settings.weekStartsOn).start, -7 * (weeks - 1))
  return [
    {
      id: 'workouts-streak',
      domain: 'workout',
      severity: 'positive',
      priority: 35 + Math.min(weeks, 20),
      title: `${weeks}-week workout streak`,
      detail: `You’ve trained every week since ${format(parseDayKey(since), 'MMM d')}.`,
      link: '/workouts',
    },
  ]
}

/** "today", "yesterday", "on Tuesday" (for the last week). */
function when(day: string, today: string): string {
  const diff = daysBetween(day, today)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `on ${format(parseDayKey(day), 'EEEE')}`
}

/** Personal records set in the last week. */
export const newRecords: InsightRule = ({ data, today, settings }) => {
  const recent = data.workouts.filter(
    (w) => w.date <= today && daysBetween(w.date, today) < RECORD_DAYS,
  )
  const found = new Map<string, { date: string; detail: string }>()
  for (const workout of recent.sort((a, b) => a.date.localeCompare(b.date))) {
    for (const record of findNewRecords(workout, data.workouts)) {
      const best = getPersonalRecords([workout], record.exerciseId, settings.weightUnit)
      const set = best.heaviest ?? best.mostReps
      if (!set) continue
      const what = set.weight
        ? `${formatWeight(Math.round(set.weight * 10) / 10, settings.weightUnit)} × ${set.reps}`
        : plural(set.reps, 'rep')
      found.set(record.exerciseId, {
        date: workout.date,
        detail: `${what} ${when(workout.date, today)}`,
      })
    }
  }
  if (found.size === 0) return []

  const name = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? 'an exercise'
  const ids = [...found.keys()]
  const [first] = ids
  return [
    {
      id: `workouts-records-${ids.join('-')}`,
      domain: 'workout',
      severity: 'positive',
      priority: 65,
      title: `New ${ids.length === 1 ? 'record' : 'records'} on ${joinNames(ids.map(name))}`,
      detail:
        ids.length === 1
          ? `${found.get(first)!.detail}.`
          : 'Your best sets yet, all in the last week.',
      link: ids.length === 1 ? `/workouts/exercises/${first}` : '/workouts',
    },
  ]
}

/** A regular exercise that hasn't been done for a while. */
export const neglectedExercise: InsightRule = ({ data, today }) => {
  const history = { start: addDaysToKey(today, -(NEGLECT_HISTORY_DAYS - 1)), end: today }
  const [pick] = getTopExercises(data.workouts, Infinity, history).filter(
    (u) => u.sessions >= NEGLECT_MIN_SESSIONS && daysBetween(u.lastDate, today) >= NEGLECT_DAYS,
  )
  if (!pick) return []
  const exercise = data.exercises.find((e) => e.id === pick.exerciseId)
  if (!exercise || exercise.archived) return []
  const days = daysBetween(pick.lastDate, today)
  const gap = days >= 21 ? plural(Math.floor(days / 7), 'week') : plural(days, 'day')
  return [
    {
      id: `workouts-neglected-${exercise.id}`,
      domain: 'workout',
      severity: 'neutral',
      priority: 30,
      title: `No ${exercise.name} in ${gap}`,
      detail: `You did it ${plural(pick.sessions, 'time')} in the last three months, last on ${format(parseDayKey(pick.lastDate), 'MMM d')}.`,
      link: `/workouts/exercises/${exercise.id}`,
    },
  ]
}

export const workoutRules: InsightRule[] = [weeklyCount, streak, newRecords, neglectedExercise]
