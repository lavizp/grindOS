import {
  formatDuration,
  formatNight,
  formatRelativeDay,
  formatSets,
  formatTimeOfDay,
  formatWeight,
} from '@/lib/formatters'

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(408)).toBe('6h 48m')
    expect(formatDuration(480)).toBe('8h')
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(0)).toBe('0m')
  })

  it('rounds and clamps', () => {
    expect(formatDuration(59.6)).toBe('1h')
    expect(formatDuration(-10)).toBe('0m')
  })
})

describe('formatWeight', () => {
  it('formats with unit and trims trailing zeros', () => {
    expect(formatWeight(60, 'kg', 'en-US')).toBe('60 kg')
    expect(formatWeight(62.5, 'kg', 'en-US')).toBe('62.5 kg')
    expect(formatWeight(135, 'lb', 'en-US')).toBe('135 lb')
  })
})

describe('formatRelativeDay', () => {
  const today = '2026-10-07' // Wednesday

  it('uses words for nearby days', () => {
    expect(formatRelativeDay('2026-10-07', today)).toBe('Today')
    expect(formatRelativeDay('2026-10-06', today)).toBe('Yesterday')
    expect(formatRelativeDay('2026-10-08', today)).toBe('Tomorrow')
  })

  it('uses weekday names within the last week', () => {
    expect(formatRelativeDay('2026-10-05', today)).toBe('Monday')
    expect(formatRelativeDay('2026-10-01', today)).toBe('Thursday')
  })

  it('uses dates beyond a week, adding the year when it differs', () => {
    expect(formatRelativeDay('2026-09-30', today)).toBe('Sep 30')
    expect(formatRelativeDay('2025-12-25', today)).toBe('Dec 25, 2025')
  })
})

describe('formatTimeOfDay', () => {
  it('formats minutes since midnight in the locale', () => {
    expect(formatTimeOfDay(23 * 60 + 30, 'en-US')).toBe('11:30 PM')
    expect(formatTimeOfDay(7 * 60 + 5, 'en-US')).toBe('7:05 AM')
    expect(formatTimeOfDay(0, 'en-GB')).toBe('00:00')
  })
})

describe('formatNight', () => {
  const today = '2026-10-08' // a Thursday
  it('names the evening the night started', () => {
    expect(formatNight('2026-10-08', today)).toBe('Last night')
    expect(formatNight('2026-10-07', today)).toBe('Tuesday night')
    expect(formatNight('2026-10-02', today)).toBe('Thursday night')
    expect(formatNight('2026-10-01', today)).toBe('Night of Sep 30')
    expect(formatNight('2025-12-01', today)).toBe('Night of Nov 30, 2025')
  })
})

describe('formatSets', () => {
  it('collapses identical sets', () => {
    expect(
      formatSets(
        [
          { reps: 8, weight: 60 },
          { reps: 8, weight: 60 },
          { reps: 8, weight: 60 },
        ],
        'kg',
        'en-US',
      ),
    ).toBe('3×8 @ 60 kg')
    expect(formatSets([{ reps: 5, weight: 102.5 }], 'kg', 'en-US')).toBe('5 @ 102.5 kg')
    expect(formatSets([{ reps: 12 }, { reps: 12 }], 'kg')).toBe('2×12')
  })

  it('groups reps at one weight', () => {
    expect(
      formatSets(
        [
          { reps: 8, weight: 80 },
          { reps: 8, weight: 80 },
          { reps: 7, weight: 80 },
        ],
        'kg',
        'en-US',
      ),
    ).toBe('8, 8, 7 @ 80 kg')
  })

  it('lists sets that differ', () => {
    expect(
      formatSets(
        [
          { reps: 8, weight: 60 },
          { reps: 6, weight: 65 },
        ],
        'lb',
        'en-US',
      ),
    ).toBe('8 @ 60, 6 @ 65 lb')
    expect(formatSets([{ reps: 12 }, { reps: 10 }], 'kg')).toBe('12, 10')
    expect(formatSets([], 'kg')).toBe('No sets')
  })
})
