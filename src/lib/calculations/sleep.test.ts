import type { Sleep } from '@/db/schema'
import {
  fromNightClock,
  getAverageQuality,
  getAverageSleep,
  getBestWorstNights,
  getDuration,
  getSleepConsistency,
  getSleepDebt,
  getSleepTrend,
  toNightClock,
} from '@/lib/calculations/sleep'
import { resolveSleepTimes } from '@/lib/dates'

let seq = 0
function night(date: string, bed: string, wake: string, quality?: 1 | 2 | 3 | 4 | 5): Sleep {
  seq += 1
  return {
    id: `s${seq}`,
    date,
    ...resolveSleepTimes(date, bed, wake),
    quality,
    createdAt: seq,
    updatedAt: seq,
  }
}

const week = { start: '2026-10-04', end: '2026-10-10' }

describe('night clock', () => {
  it('keeps times either side of midnight close together', () => {
    expect(toNightClock('2026-10-04T23:30')).toBe(690)
    expect(toNightClock('2026-10-05T00:30')).toBe(750)
    expect(toNightClock('2026-10-05T07:00')).toBe(1140)
    expect(toNightClock('2026-10-05T12:00')).toBe(0)
  })

  it('round-trips to minutes since midnight', () => {
    expect(fromNightClock(690)).toBe(23 * 60 + 30)
    expect(fromNightClock(750)).toBe(30)
    expect(fromNightClock(1140)).toBe(7 * 60)
  })
})

describe('getDuration', () => {
  it('handles nights that cross midnight', () => {
    expect(getDuration(night('2026-10-05', '23:15', '06:45'))).toBe(450)
  })

  it('handles bedtimes after midnight', () => {
    expect(getDuration(night('2026-10-05', '01:30', '08:00'))).toBe(390)
  })
})

describe('getAverageSleep', () => {
  it('averages logged nights, optionally within a range', () => {
    const rows = [
      night('2026-10-05', '23:00', '07:00'), // 480
      night('2026-10-06', '00:00', '06:00'), // 360
      night('2026-10-20', '22:00', '08:00'), // 600, outside the week
    ]
    expect(getAverageSleep(rows, week)).toBe(420)
    expect(getAverageSleep(rows)).toBe(480)
  })

  it('is null for an empty range', () => {
    expect(getAverageSleep([], week)).toBeNull()
    expect(getAverageSleep([night('2026-11-01', '23:00', '07:00')], week)).toBeNull()
  })
})

describe('getAverageQuality', () => {
  it('ignores unrated nights', () => {
    const rows = [
      night('2026-10-05', '23:00', '07:00', 4),
      night('2026-10-06', '23:00', '07:00'),
      night('2026-10-07', '23:00', '07:00', 2),
    ]
    expect(getAverageQuality(rows)).toBe(3)
    expect(getAverageQuality([night('2026-10-05', '23:00', '07:00')])).toBeNull()
  })
})

describe('getSleepConsistency', () => {
  it('averages bedtimes across midnight correctly', () => {
    const result = getSleepConsistency([
      night('2026-10-05', '23:30', '07:00'),
      night('2026-10-06', '00:30', '07:00'),
    ])!
    // The naive average of 23:30 and 00:30 would be noon.
    expect(result.bedtime).toBe(0)
    expect(result.bedtimeSpread).toBe(30)
    expect(result.wakeTime).toBe(7 * 60)
    expect(result.wakeSpread).toBe(0)
  })

  it('is null for an empty range', () => {
    expect(getSleepConsistency([], week)).toBeNull()
  })
})

describe('getSleepTrend', () => {
  it('returns every day of the range with gaps for missing nights', () => {
    const trend = getSleepTrend([night('2026-10-06', '23:00', '06:30', 5)], week)
    expect(trend).toHaveLength(7)
    expect(trend[0]).toMatchObject({ date: '2026-10-04', durationMin: null, entry: null })
    expect(trend[2]).toMatchObject({
      date: '2026-10-06',
      durationMin: 450,
      bedtime: 660,
      wakeTime: 1110,
      quality: 5,
    })
  })
})

describe('getBestWorstNights', () => {
  it('picks the longest and shortest nights', () => {
    const long = night('2026-10-05', '22:00', '07:00')
    const short = night('2026-10-06', '01:00', '06:00')
    const mid = night('2026-10-07', '23:00', '07:00')
    expect(getBestWorstNights([mid, long, short])).toEqual({ best: long, worst: short })
  })

  it('breaks ties on quality', () => {
    const good = night('2026-10-05', '23:00', '07:00', 5)
    const bad = night('2026-10-06', '23:00', '07:00', 1)
    expect(getBestWorstNights([bad, good])).toEqual({ best: good, worst: bad })
  })

  it('is null when there are no nights', () => {
    expect(getBestWorstNights([], week)).toBeNull()
  })
})

describe('getSleepDebt', () => {
  it('nets shortfalls against surpluses', () => {
    const rows = [
      night('2026-10-05', '00:00', '06:00'), // 2h short
      night('2026-10-06', '22:00', '07:00'), // 1h over
      night('2026-10-07', '23:30', '07:00'), // 30m short
    ]
    expect(getSleepDebt(rows, 480, week)).toEqual({
      netMin: 90,
      nightsLogged: 3,
      nightsBelowTarget: 2,
    })
  })

  it('is zero with no nights', () => {
    expect(getSleepDebt([], 480, week)).toEqual({
      netMin: 0,
      nightsLogged: 0,
      nightsBelowTarget: 0,
    })
  })
})
