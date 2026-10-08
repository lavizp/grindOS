import { ALL_RULES, getInsights, type InsightRule } from '@/lib/calculations/insights'
import { context, days, nightOf, pay } from '@/test/insight-fixtures'

const today = '2026-10-22'

describe('getInsights', () => {
  it('says nothing at all without data', () => {
    expect(getInsights(context(today))).toEqual([])
    for (const rule of ALL_RULES) expect(rule(context(today))).toEqual([])
  })

  it('orders findings by priority, then id', () => {
    const rule =
      (id: string, priority: number): InsightRule =>
      () => [{ id, priority, domain: 'sleep', severity: 'neutral', title: id }]
    const ids = getInsights(context(today), [rule('b', 10), rule('c', 50), rule('a', 10)]).map(
      (i) => i.id,
    )
    expect(ids).toEqual(['c', 'a', 'b'])
  })

  it('runs every rule on real-looking data', () => {
    const insights = getInsights(
      context(today, {
        sleep: days(today, 6).map((d) => nightOf(d, 400)),
        payments: days(today, 6).map((d) => pay(d, 10000)),
      }),
    )
    expect(insights[0]).toMatchObject({ id: 'sleep-under-target' })
    expect(insights.map((i) => i.id)).toContain('spending-top-category-food')
  })
})
