import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

/** Local calendar day, `yyyy-MM-dd`. Sorts lexicographically. */
export type DayKey = string
/** Local wall-clock date-time without timezone, `yyyy-MM-ddTHH:mm`. */
export type LocalDateTime = string
/** Local wall-clock time, `HH:mm`. */
export type TimeOfDay = string
export type WeekStart = 0 | 1

/** Inclusive range of local days. */
export interface DayRange {
  start: DayKey
  end: DayKey
}

const DAY_KEY_FORMAT = 'yyyy-MM-dd'
const LOCAL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm"

export const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
export const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

// Never use toISOString() for day keys: it converts to UTC and shifts the day.
export function toDayKey(date: Date): DayKey {
  return format(date, DAY_KEY_FORMAT)
}

export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now)
}

/** Parses a day key to local midnight. Throws on invalid input. */
export function parseDayKey(key: DayKey): Date {
  const date = DAY_KEY_PATTERN.test(key) ? parse(key, DAY_KEY_FORMAT, new Date()) : new Date(NaN)
  if (!isValid(date)) throw new RangeError(`Invalid day key: ${key}`)
  return date
}

export function isDayKey(value: string): boolean {
  return DAY_KEY_PATTERN.test(value) && isValid(parse(value, DAY_KEY_FORMAT, new Date()))
}

export function addDaysToKey(key: DayKey, amount: number): DayKey {
  return toDayKey(addDays(parseDayKey(key), amount))
}

export function daysBetween(from: DayKey, to: DayKey): number {
  return differenceInCalendarDays(parseDayKey(to), parseDayKey(from))
}

function toDate(value: Date | DayKey): Date {
  return typeof value === 'string' ? parseDayKey(value) : value
}

export function weekRange(value: Date | DayKey, weekStartsOn: WeekStart): DayRange {
  const date = toDate(value)
  return {
    start: toDayKey(startOfWeek(date, { weekStartsOn })),
    end: toDayKey(endOfWeek(date, { weekStartsOn })),
  }
}

export function monthRange(value: Date | DayKey): DayRange {
  const date = toDate(value)
  return { start: toDayKey(startOfMonth(date)), end: toDayKey(endOfMonth(date)) }
}

/** The last `days` days, ending on (and including) `today`. */
export function lastNDaysRange(days: number, today: DayKey = todayKey()): DayRange {
  return { start: addDaysToKey(today, -(days - 1)), end: today }
}

/** The range of equal length immediately before `range`. */
export function previousRange(range: DayRange): DayRange {
  const length = rangeLength(range)
  return { start: addDaysToKey(range.start, -length), end: addDaysToKey(range.start, -1) }
}

export function rangeLength(range: DayRange): number {
  return daysBetween(range.start, range.end) + 1
}

export function rangeDays(range: DayRange): DayKey[] {
  return eachDayOfInterval({ start: parseDayKey(range.start), end: parseDayKey(range.end) }).map(
    toDayKey,
  )
}

export function isInRange(key: DayKey, range: DayRange): boolean {
  return key >= range.start && key <= range.end
}

export function toLocalDateTime(date: Date): LocalDateTime {
  return format(date, LOCAL_DATE_TIME_FORMAT)
}

export function parseLocalDateTime(value: LocalDateTime): Date {
  const date = LOCAL_DATE_TIME_PATTERN.test(value)
    ? parse(value, LOCAL_DATE_TIME_FORMAT, new Date())
    : new Date(NaN)
  if (!isValid(date)) throw new RangeError(`Invalid local date-time: ${value}`)
  return date
}

export function isLocalDateTime(value: string): boolean {
  return (
    LOCAL_DATE_TIME_PATTERN.test(value) && isValid(parse(value, LOCAL_DATE_TIME_FORMAT, new Date()))
  )
}

export function combineDayAndTime(day: DayKey, time: TimeOfDay): LocalDateTime {
  return `${day}T${time}`
}

/**
 * Turns the times a user picks for "last night" into full date-times.
 * `wakeDay` is the morning they woke up. If bedtime is at or after the wake
 * time on the clock (23:30 → 07:00), they went to bed the previous day.
 */
export function resolveSleepTimes(
  wakeDay: DayKey,
  bedtime: TimeOfDay,
  wakeTime: TimeOfDay,
): { bedtime: LocalDateTime; wakeTime: LocalDateTime } {
  const bedDay = bedtime >= wakeTime ? addDaysToKey(wakeDay, -1) : wakeDay
  return {
    bedtime: combineDayAndTime(bedDay, bedtime),
    wakeTime: combineDayAndTime(wakeDay, wakeTime),
  }
}

/** Actual elapsed minutes between bedtime and wake time (DST-aware). */
export function sleepDurationMin(bedtime: LocalDateTime, wakeTime: LocalDateTime): number {
  return differenceInMinutes(parseLocalDateTime(wakeTime), parseLocalDateTime(bedtime))
}
