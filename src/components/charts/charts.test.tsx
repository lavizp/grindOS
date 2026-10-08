import { render, screen } from '@testing-library/react'
import { BarTrend, CalendarHeatmap, CategoryDonut, LineTrend } from '@/components/charts'

// Smoke tests: jsdom has no layout, so these only check the wrappers mount.

describe('chart wrappers', () => {
  it('mount without data', () => {
    render(
      <>
        <BarTrend data={[]} color="spending" formatValue={String} />
        <LineTrend data={[]} series={[{ dataKey: 'value', color: 'sleep' }]} formatValue={String} />
        <CategoryDonut data={[]} center="Rs 0" />
      </>,
    )
    expect(screen.getByText('Rs 0')).toBeInTheDocument()
  })

  it('draws a heatmap cell per day, ending with the current week', () => {
    const { container } = render(
      <CalendarHeatmap
        values={{ '2026-10-06': 1, '2026-10-08': 2 }}
        weeks={4}
        weekStartsOn={0}
        color="workout"
        today="2026-10-08"
        describe={(n) => `${n} workouts`}
      />,
    )
    expect(container.querySelectorAll('[title]')).toHaveLength(4 * 7 - 2) // Oct 9, 10 are future
    expect(container.querySelector('[title="Oct 8: 2 workouts"]')).toHaveStyle({ opacity: '1' })
    expect(container.querySelector('[title="Sep 13: 0 workouts"]')).toBeInTheDocument()
  })
})
