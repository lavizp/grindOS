import { formatPeriodLabel, isCurrentPeriod, periodRange, shiftAnchor } from '@/lib/periods'

const today = '2026-10-08' // Thursday

describe('periodRange', () => {
  it('respects the week start', () => {
    expect(periodRange('week', today, 0)).toEqual({ start: '2026-10-04', end: '2026-10-10' })
    expect(periodRange('week', today, 1)).toEqual({ start: '2026-10-05', end: '2026-10-11' })
  })

  it('covers the whole month', () => {
    expect(periodRange('month', today, 0)).toEqual({ start: '2026-10-01', end: '2026-10-31' })
  })
})

describe('shiftAnchor', () => {
  it('moves by a week', () => {
    expect(shiftAnchor('week', today, -1)).toBe('2026-10-01')
    expect(shiftAnchor('week', today, 1)).toBe('2026-10-15')
  })

  it('moves by a month and clamps to the month end', () => {
    expect(shiftAnchor('month', '2026-03-31', -1)).toBe('2026-02-28')
    expect(shiftAnchor('month', '2026-12-15', 1)).toBe('2027-01-15')
  })
})

describe('isCurrentPeriod', () => {
  it('is true only when today is inside the range', () => {
    expect(isCurrentPeriod(periodRange('week', today, 0), today)).toBe(true)
    expect(isCurrentPeriod(periodRange('week', '2026-10-01', 0), today)).toBe(false)
  })
})

describe('formatPeriodLabel', () => {
  const week = (anchor: string) => periodRange('week', anchor, 0)
  const month = (anchor: string) => periodRange('month', anchor, 0)

  it('names the current and previous week', () => {
    expect(formatPeriodLabel('week', week(today), today)).toBe('This week')
    expect(formatPeriodLabel('week', week('2026-10-01'), today)).toBe('Last week')
  })

  it('shows older weeks as a date span', () => {
    expect(formatPeriodLabel('week', week('2026-09-10'), today)).toBe('Sep 6 – 12')
    expect(formatPeriodLabel('week', week('2026-09-01'), today)).toBe('Aug 30 – Sep 5')
    expect(formatPeriodLabel('week', week('2025-12-31'), today)).toBe('Dec 28 – Jan 3, 2026')
  })

  it('uses the week start for this/last week', () => {
    expect(formatPeriodLabel('week', periodRange('week', today, 1), today, 1)).toBe('This week')
  })

  it('names months', () => {
    expect(formatPeriodLabel('month', month(today), today)).toBe('This month')
    expect(formatPeriodLabel('month', month('2026-09-02'), today)).toBe('September')
    expect(formatPeriodLabel('month', month('2025-12-02'), today)).toBe('December 2025')
  })
})

describe('single days', () => {
  it('ranges over and steps by one day', () => {
    expect(periodRange('day', today, 0)).toEqual({ start: today, end: today })
    expect(shiftAnchor('day', today, -1)).toBe('2026-10-07')
    expect(shiftAnchor('day', '2026-10-31', 1)).toBe('2026-11-01')
  })

  it('names the day', () => {
    const day = (d: string) => formatPeriodLabel('day', { start: d, end: d }, today)
    expect(day(today)).toBe('Today')
    expect(day('2026-10-07')).toBe('Yesterday')
    expect(day('2026-10-05')).toBe('Mon, Oct 5')
    expect(day('2025-12-31')).toBe('Dec 31, 2025')
  })
})
