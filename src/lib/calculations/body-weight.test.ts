import type { BodyWeight } from '@/db/schema'
import { getWeightChange, getWeightPoints, pointsSince } from '@/lib/calculations/body-weight'

let seq = 0
function weighIn(date: string, weight: number, unit: 'kg' | 'lb' = 'kg'): BodyWeight {
  seq += 1
  return { id: `b${seq}`, date, weight, unit, createdAt: seq, updatedAt: seq }
}

describe('getWeightPoints', () => {
  it('sorts oldest first and averages the trailing 7 days', () => {
    const points = getWeightPoints(
      [weighIn('2026-10-03', 81), weighIn('2026-10-01', 80), weighIn('2026-10-09', 79)],
      'kg',
    )
    expect(points).toEqual([
      { date: '2026-10-01', weight: 80, average: 80 },
      { date: '2026-10-03', weight: 81, average: 80.5 },
      // Oct 1 is outside Oct 3–9, so it drops out of the average.
      { date: '2026-10-09', weight: 79, average: 80 },
    ])
  })

  it('converts to the display unit', () => {
    const [point] = getWeightPoints([weighIn('2026-10-01', 176.4, 'lb')], 'kg')
    expect(point.weight).toBe(80)
  })

  it('handles no entries', () => {
    expect(getWeightPoints([], 'kg')).toEqual([])
  })
})

describe('getWeightChange', () => {
  const points = getWeightPoints(
    [weighIn('2026-09-01', 84), weighIn('2026-09-20', 82), weighIn('2026-10-09', 80)],
    'kg',
  )

  it('compares the first and last averages', () => {
    expect(getWeightChange(points)).toMatchObject({ change: -4 })
  })

  it('works on a recent slice', () => {
    expect(getWeightChange(pointsSince(points, '2026-09-15'))).toMatchObject({ change: -2 })
    expect(pointsSince(points, undefined)).toHaveLength(3)
  })

  it('needs two points', () => {
    expect(getWeightChange(points.slice(0, 1))).toBeNull()
  })
})
