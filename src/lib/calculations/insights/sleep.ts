import { format } from 'date-fns'
import { getDuration, getSleepConsistency } from '@/lib/calculations/sleep'
import { addDaysToKey, daysBetween, parseDayKey, type DayRange } from '@/lib/dates'
import { formatDuration } from '@/lib/formatters'
import { mean } from '@/lib/calculations/insights/helpers'
import type { InsightRule } from '@/lib/calculations/insights/types'

const RECENT_DAYS = 7
/** Nights in the last week before judging the average. */
const RECENT_MIN_NIGHTS = 4
/** Further below target than this is worth a warning. */
const TARGET_SLACK_MIN = 15
const CONSISTENCY_WINDOW_DAYS = 14
const CONSISTENCY_MIN_NIGHTS = 5
/** A change in bedtime spread smaller than this is noise. */
export const CONSISTENCY_CHANGE_MIN = 15
const WEEKDAY_WINDOW_DAYS = 56
const WEEKDAY_MIN_NIGHTS = 14
const WEEKDAY_MIN_PER_DAY = 2
/** A weekday has to differ from the rest by this much to be called out. */
export const WEEKDAY_DIFF_MIN = 45

/** The last `days` days up to today. */
const lastDays = (today: string, days: number, offset = 0): DayRange => ({
  start: addDaysToKey(today, -(offset + days - 1)),
  end: addDaysToKey(today, -offset),
})

/** This week's average against the target. */
export const sleepVsTarget: InsightRule = ({ data, today, settings }) => {
  const week = lastDays(today, RECENT_DAYS)
  const nights = data.sleep.filter((s) => s.date >= week.start && s.date <= week.end)
  if (nights.length < RECENT_MIN_NIGHTS) return []
  const average = mean(nights.map(getDuration))
  const target = settings.sleepTargetMin
  const diff = average - target

  if (diff < -TARGET_SLACK_MIN) {
    return [
      {
        id: 'sleep-under-target',
        domain: 'sleep',
        severity: 'warning',
        priority: 70,
        title: `You’re averaging ${formatDuration(average)} a night`,
        detail: `That’s ${formatDuration(-diff)} under your ${formatDuration(target)} target over the last week.`,
        link: '/sleep',
      },
    ]
  }
  if (diff >= 0) {
    return [
      {
        id: 'sleep-on-target',
        domain: 'sleep',
        severity: 'positive',
        priority: 45,
        title: `You’re meeting your ${formatDuration(target)} sleep target`,
        detail: `${formatDuration(average)} a night on average over the last week.`,
        link: '/sleep',
      },
    ]
  }
  return []
}

/** Whether bedtimes have become more or less regular than the two weeks before. */
export const consistencyChange: InsightRule = ({ data, today }) => {
  const recent = lastDays(today, CONSISTENCY_WINDOW_DAYS)
  const before = lastDays(today, CONSISTENCY_WINDOW_DAYS, CONSISTENCY_WINDOW_DAYS)
  const inRange = (range: DayRange) =>
    data.sleep.filter((s) => s.date >= range.start && s.date <= range.end)
  const now = inRange(recent)
  const then = inRange(before)
  if (now.length < CONSISTENCY_MIN_NIGHTS || then.length < CONSISTENCY_MIN_NIGHTS) return []

  const spreadNow = getSleepConsistency(now)!.bedtimeSpread
  const spreadThen = getSleepConsistency(then)!.bedtimeSpread
  const change = spreadNow - spreadThen
  if (Math.abs(change) < CONSISTENCY_CHANGE_MIN) return []
  const steadier = change < 0
  return [
    {
      id: `sleep-consistency-${steadier ? 'better' : 'worse'}`,
      domain: 'sleep',
      severity: steadier ? 'positive' : 'warning',
      priority: 40,
      title: steadier
        ? 'Your bedtime has become more regular'
        : 'Your bedtime has become less regular',
      detail: `It varies by about ${formatDuration(spreadNow)} lately, ${steadier ? 'down' : 'up'} from ${formatDuration(spreadThen)} in the two weeks before.`,
      link: '/sleep',
    },
  ]
}

/** A night of the week that's clearly shorter (or longer) than the rest. */
export const weekdayPattern: InsightRule = ({ data, today }) => {
  const nights = data.sleep.filter(
    (s) => s.date <= today && daysBetween(s.date, today) < WEEKDAY_WINDOW_DAYS,
  )
  if (nights.length < WEEKDAY_MIN_NIGHTS) return []

  // Nights are named by the evening they start, as everywhere else.
  const byEvening = new Map<string, number[]>()
  for (const night of nights) {
    const evening = format(parseDayKey(addDaysToKey(night.date, -1)), 'EEEE')
    byEvening.set(evening, [...(byEvening.get(evening) ?? []), getDuration(night)])
  }

  const candidates = [...byEvening.entries()]
    .filter(([, durations]) => durations.length >= WEEKDAY_MIN_PER_DAY)
    .map(([evening, durations]) => {
      const others = nights
        .filter((n) => format(parseDayKey(addDaysToKey(n.date, -1)), 'EEEE') !== evening)
        .map(getDuration)
      return { evening, average: mean(durations), diff: mean(durations) - mean(others) }
    })
    .filter((c) => Math.abs(c.diff) >= WEEKDAY_DIFF_MIN)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

  const [pick] = candidates
  if (!pick) return []
  const shorter = pick.diff < 0
  return [
    {
      id: `sleep-weekday-${pick.evening.toLowerCase()}`,
      domain: 'sleep',
      severity: shorter ? 'warning' : 'neutral',
      priority: 25,
      title: `${pick.evening} nights are your ${shorter ? 'shortest' : 'longest'}`,
      detail: `${formatDuration(pick.average)} on average, ${formatDuration(Math.abs(pick.diff))} ${shorter ? 'less' : 'more'} than other nights.`,
      link: '/sleep',
    },
  ]
}

export const sleepRules: InsightRule[] = [sleepVsTarget, consistencyChange, weekdayPattern]
