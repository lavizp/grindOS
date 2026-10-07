import {
  addDaysToKey,
  isDayKey,
  isInRange,
  lastNDaysRange,
  monthRange,
  parseDayKey,
  previousRange,
  rangeDays,
  rangeLength,
  resolveSleepTimes,
  sleepDurationMin,
  toDayKey,
  toLocalDateTime,
  weekRange,
} from '@/lib/dates'

describe('test environment', () => {
  it('runs in a DST-observing timezone', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/New_York')
  })
})

describe('toDayKey', () => {
  it('uses the local day, not UTC', () => {
    const lateEvening = new Date(2026, 0, 1, 23, 30) // 04:30 UTC on Jan 2
    expect(lateEvening.toISOString().slice(0, 10)).toBe('2026-01-02')
    expect(toDayKey(lateEvening)).toBe('2026-01-01')
  })

  it('round-trips with parseDayKey', () => {
    expect(toDayKey(parseDayKey('2026-03-08'))).toBe('2026-03-08')
  })
})

describe('parseDayKey / isDayKey', () => {
  it('rejects malformed and impossible dates', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', '', 'yesterday']) {
      expect(isDayKey(bad)).toBe(false)
      expect(() => parseDayKey(bad)).toThrow(RangeError)
    }
  })

  it('accepts leap days', () => {
    expect(isDayKey('2028-02-29')).toBe(true)
    expect(isDayKey('2026-02-29')).toBe(false)
  })
})

describe('addDaysToKey', () => {
  it('crosses month and year boundaries', () => {
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('is not affected by DST changes', () => {
    expect(addDaysToKey('2026-03-07', 1)).toBe('2026-03-08') // spring forward
    expect(addDaysToKey('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDaysToKey('2026-11-01', 1)).toBe('2026-11-02') // fall back
  })
})

describe('weekRange', () => {
  // 2026-10-07 is a Wednesday.
  it('respects a Sunday week start', () => {
    expect(weekRange('2026-10-07', 0)).toEqual({ start: '2026-10-04', end: '2026-10-10' })
  })

  it('respects a Monday week start', () => {
    expect(weekRange('2026-10-07', 1)).toEqual({ start: '2026-10-05', end: '2026-10-11' })
  })

  it('handles the week start day itself and the day before', () => {
    expect(weekRange('2026-10-04', 0).start).toBe('2026-10-04')
    expect(weekRange('2026-10-04', 1)).toEqual({ start: '2026-09-28', end: '2026-10-04' })
  })

  it('spans a year boundary', () => {
    expect(weekRange('2027-01-01', 1)).toEqual({ start: '2026-12-28', end: '2027-01-03' })
  })
})

describe('monthRange', () => {
  it('covers the whole month', () => {
    expect(monthRange('2026-02-14')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(monthRange(new Date(2028, 1, 3))).toEqual({ start: '2028-02-01', end: '2028-02-29' })
  })
})

describe('range helpers', () => {
  it('builds the last N days ending today', () => {
    expect(lastNDaysRange(7, '2026-10-07')).toEqual({ start: '2026-10-01', end: '2026-10-07' })
  })

  it('finds the previous range of equal length', () => {
    const range = { start: '2026-10-01', end: '2026-10-07' }
    expect(previousRange(range)).toEqual({ start: '2026-09-24', end: '2026-09-30' })
    expect(rangeLength(range)).toBe(7)
  })

  it('lists every day in a range across DST', () => {
    expect(rangeDays({ start: '2026-03-07', end: '2026-03-09' })).toEqual([
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
    ])
  })

  it('checks inclusive membership', () => {
    const range = { start: '2026-10-01', end: '2026-10-07' }
    expect(isInRange('2026-10-01', range)).toBe(true)
    expect(isInRange('2026-10-07', range)).toBe(true)
    expect(isInRange('2026-10-08', range)).toBe(false)
  })
})

describe('resolveSleepTimes', () => {
  it('puts a late-evening bedtime on the previous day', () => {
    expect(resolveSleepTimes('2026-10-07', '23:30', '07:00')).toEqual({
      bedtime: '2026-10-06T23:30',
      wakeTime: '2026-10-07T07:00',
    })
  })

  it('keeps an after-midnight bedtime on the wake day', () => {
    expect(resolveSleepTimes('2026-10-07', '01:15', '08:00')).toEqual({
      bedtime: '2026-10-07T01:15',
      wakeTime: '2026-10-07T08:00',
    })
  })

  it('crosses month boundaries', () => {
    expect(resolveSleepTimes('2026-11-01', '22:00', '06:00').bedtime).toBe('2026-10-31T22:00')
  })
})

describe('sleepDurationMin', () => {
  it('measures sleep across midnight', () => {
    expect(sleepDurationMin('2026-10-06T23:30', '2026-10-07T07:00')).toBe(450)
  })

  it('measures sleep that starts after midnight', () => {
    expect(sleepDurationMin('2026-10-07T01:15', '2026-10-07T08:00')).toBe(405)
  })

  it('counts real elapsed time when clocks spring forward', () => {
    // 23:00 → 07:00 on the night clocks skip 02:00–03:00 is only 7 hours.
    expect(sleepDurationMin('2026-03-07T23:00', '2026-03-08T07:00')).toBe(7 * 60)
  })

  it('counts real elapsed time when clocks fall back', () => {
    expect(sleepDurationMin('2026-10-31T23:00', '2026-11-01T07:00')).toBe(9 * 60)
  })

  it('is negative when wake time is before bedtime', () => {
    expect(sleepDurationMin('2026-10-07T08:00', '2026-10-07T07:00')).toBe(-60)
  })
})

describe('toLocalDateTime', () => {
  it('formats local wall-clock time', () => {
    expect(toLocalDateTime(new Date(2026, 9, 7, 6, 5))).toBe('2026-10-07T06:05')
  })
})
