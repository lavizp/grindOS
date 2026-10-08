import { joinNames, median, percent } from '@/lib/calculations/insights/helpers'

describe('insight helpers', () => {
  it('joins names, summarizing long lists', () => {
    expect(joinNames(['Squat'])).toBe('Squat')
    expect(joinNames(['Squat', 'Dips'])).toBe('Squat and Dips')
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C')
    expect(joinNames(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toBe('A, B and 5 more')
  })

  it('takes the median and formats percentages', () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(percent(-0.256)).toBe('26%')
  })
})
