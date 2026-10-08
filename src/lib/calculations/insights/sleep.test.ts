import { format } from 'date-fns'
import { consistencyChange, sleepVsTarget, weekdayPattern } from '@/lib/calculations/insights/sleep'
import { addDaysToKey, parseDayKey } from '@/lib/dates'
import { context, days, night, nightOf } from '@/test/insight-fixtures'

const today = '2026-10-20' // Tuesday

describe('sleepVsTarget', () => {
  it('warns when the last week averages well under target', () => {
    const sleep = days(today, 5).map((d) => nightOf(d, 420))
    expect(sleepVsTarget(context(today, { sleep }))).toMatchObject([
      {
        id: 'sleep-under-target',
        severity: 'warning',
        title: 'You’re averaging 7h a night',
        detail: 'That’s 1h under your 8h target over the last week.',
      },
    ])
  })

  it('celebrates meeting the target', () => {
    const sleep = days(today, 4).map((d) => nightOf(d, 495))
    expect(sleepVsTarget(context(today, { sleep }))).toMatchObject([
      {
        id: 'sleep-on-target',
        severity: 'positive',
        detail: '8h 15m a night on average over the last week.',
      },
    ])
  })

  it('says nothing when just short, or with too few nights', () => {
    expect(
      sleepVsTarget(context(today, { sleep: days(today, 5).map((d) => nightOf(d, 470)) })),
    ).toEqual([])
    expect(
      sleepVsTarget(context(today, { sleep: days(today, 3).map((d) => nightOf(d, 300)) })),
    ).toEqual([])
    // Nights older than a week don't count.
    expect(
      sleepVsTarget(context(today, { sleep: days(today, 5, 7).map((d) => nightOf(d, 300)) })),
    ).toEqual([])
  })
})

describe('consistencyChange', () => {
  // Bedtimes alternating either side of a center: the spread is half the gap.
  const alternating = (dates: string[], early: string, late: string) =>
    dates.map((d, i) => night(d, i % 2 ? late : early, '07:00'))

  it('notices bedtimes becoming more regular', () => {
    const sleep = [
      ...alternating(days(today, 6), '22:45', '23:15'), // ±15m
      ...alternating(days(today, 6, 14), '22:00', '00:00'), // ±1h
    ]
    expect(consistencyChange(context(today, { sleep }))).toMatchObject([
      {
        id: 'sleep-consistency-better',
        severity: 'positive',
        detail: 'It varies by about 15m lately, down from 1h in the two weeks before.',
      },
    ])
  })

  it('notices bedtimes becoming less regular', () => {
    const sleep = [
      ...alternating(days(today, 6), '22:00', '00:00'),
      ...alternating(days(today, 6, 14), '22:45', '23:15'),
    ]
    expect(consistencyChange(context(today, { sleep }))).toMatchObject([
      { id: 'sleep-consistency-worse', severity: 'warning' },
    ])
  })

  it('needs five nights in each fortnight and a real change', () => {
    const thin = [
      ...alternating(days(today, 4), '22:45', '23:15'),
      ...alternating(days(today, 6, 14), '22:00', '00:00'),
    ]
    expect(consistencyChange(context(today, { sleep: thin }))).toEqual([])
    const same = [
      ...alternating(days(today, 6), '22:50', '23:10'),
      ...alternating(days(today, 6, 14), '22:45', '23:15'),
    ]
    expect(consistencyChange(context(today, { sleep: same }))).toEqual([])
  })
})

describe('weekdayPattern', () => {
  // Nights are named by their evening: the night ending Monday is "Sunday night".
  const evening = (wakeDay: string) => format(parseDayKey(addDaysToKey(wakeDay, -1)), 'EEEE')

  it('finds a night of the week that’s clearly shorter', () => {
    const sleep = days(today, 21).map((d) => nightOf(d, evening(d) === 'Sunday' ? 360 : 480))
    expect(weekdayPattern(context(today, { sleep }))).toMatchObject([
      {
        id: 'sleep-weekday-sunday',
        title: 'Sunday nights are your shortest',
        detail: '6h on average, 2h less than other nights.',
      },
    ])
  })

  it('stays quiet without a clear pattern or enough nights', () => {
    expect(
      weekdayPattern(context(today, { sleep: days(today, 21).map((d) => nightOf(d, 450)) })),
    ).toEqual([])
    const few = days(today, 10).map((d) => nightOf(d, evening(d) === 'Sunday' ? 300 : 480))
    expect(weekdayPattern(context(today, { sleep: few }))).toEqual([])
  })
})
