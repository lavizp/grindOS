import { render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { repositories } from '@/db'
import { seedDemoData } from '@/dev/demo-data'

// Structural accessibility (names, labels, roles, ARIA) for every screen.
// Color contrast needs real layout, so it's checked in a browser instead.

beforeAll(async () => {
  await seedDemoData(repositories, { days: 60 })
  await repositories.settings.update({ onboardedAt: 1 })
})

const SCREENS: Array<[path: string, ready: RegExp]> = [
  ['/', /Good (morning|afternoon|evening|night)/],
  ['/workouts', /^Workout$/],
  ['/sleep', /^Sleep$/],
  ['/spending', /^Spending$/],
  ['/history', /^History$/],
  ['/insights', /^Insights$/],
  ['/settings', /^Settings$/],
  ['/settings/categories', /^Categories$/],
  ['/settings/exercises', /^Exercises$/],
  ['/workouts/exercises/ex_bench_press', /^Bench Press$/],
  ['/workouts/new', /^Log workout$/],
  ['/sleep/new', /^(Log|Edit) sleep$/],
  ['/spending/new', /^Add payment$/],
]

describe('accessibility', () => {
  it.each(SCREENS)(
    '%s has no axe violations',
    async (path, ready) => {
      const { container } = render(
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />,
      )
      await screen.findByRole('heading', { name: ready })
      // Sheets render in a portal, so check the whole document.
      const results = await axe.run(document.body, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      })
      const report = results.violations.map(
        (v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html.slice(0, 120)).join('\n  ')}`,
      )
      expect(report).toEqual([])
      expect(container).toBeTruthy()
    },
    20_000,
  )
})
