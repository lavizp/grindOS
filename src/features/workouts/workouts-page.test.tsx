import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { db, repositories } from '@/db'
import { addDaysToKey, todayKey } from '@/lib/dates'
import { useAppStore } from '@/stores/app-store'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

const today = todayKey()

function logPush(date: string, benchWeight: number, extra: { durationMin?: number } = {}) {
  return repositories.workouts.create({
    date,
    name: 'Push',
    unit: 'kg',
    ...extra,
    entries: [
      {
        exerciseId: 'ex_bench_press',
        sets: [
          { reps: 5, weight: benchWeight },
          { reps: 5, weight: benchWeight },
        ],
      },
      { exerciseId: 'ex_dips', sets: [{ reps: 12 }] },
    ],
  })
}

beforeEach(() => {
  useAppStore.setState({ period: 'week' })
})

afterEach(async () => {
  await db.workouts.clear()
})

describe('workouts page', () => {
  it('invites the first workout', async () => {
    renderAt('/workouts')
    expect(await screen.findByRole('heading', { name: 'No workouts yet' })).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: 'Log workout' })) {
      expect(link).toHaveAttribute('href', '/workouts/new')
    }
  })

  it('shows this week’s count, streak, time, volume and exercises', async () => {
    await logPush(today, 60, { durationMin: 50 })
    await logPush(addDaysToKey(today, -7), 55)
    await logPush(addDaysToKey(today, -14), 50)
    renderAt('/workouts')

    const summary = (await screen.findByRole('heading', { name: 'Workouts this week' })).closest(
      'section',
    )!
    expect(summary).toHaveTextContent('1')
    expect(summary).toHaveTextContent('3-week streak')
    expect(summary).toHaveTextContent('50m')
    expect(summary).toHaveTextContent('600 kg')

    expect(screen.getByRole('link', { name: /Push.*Bench Press, Dips/ })).toBeInTheDocument()
    const top = screen.getByRole('heading', { name: 'Most frequent exercises' }).closest('section')!
    expect(within(top).getByRole('link', { name: /Bench Press/ })).toHaveAttribute(
      'href',
      '/workouts/exercises/ex_bench_press',
    )
  })

  it('keeps the streak and heatmap when the week is empty', async () => {
    await logPush(addDaysToKey(today, -7), 55)
    const { user } = renderAt('/workouts')
    expect(await screen.findByText('1-week streak')).toBeInTheDocument()
    expect(screen.getByText('No workouts this week')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /last 12 weeks/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous week/i }))
    expect(await screen.findByRole('link', { name: /Push/ })).toBeInTheDocument()
  })
})

describe('exercise page', () => {
  it('shows records, progress and history', async () => {
    await logPush(addDaysToKey(today, -14), 50)
    await logPush(addDaysToKey(today, -7), 60)
    await repositories.workouts.create({
      date: today,
      name: 'Push',
      unit: 'kg',
      entries: [{ exerciseId: 'ex_bench_press', sets: [{ reps: 10, weight: 55 }] }],
    })
    renderAt('/workouts/exercises/ex_bench_press')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bench Press' }),
    ).toBeInTheDocument()
    const records = screen.getByRole('region', { name: 'Personal records' })
    expect(within(records).getByText('Heaviest').parentElement).toHaveTextContent('60 kg')
    // 55 × (1 + 10/30) = 73.3 beats 60 × (1 + 5/30) = 70.
    expect(within(records).getByText('Best estimated 1RM').parentElement).toHaveTextContent(
      '73.3 kg',
    )
    expect(within(records).getByText('Most reps').parentElement).toHaveTextContent('10')
    expect(within(records).getByText('Sessions').parentElement).toHaveTextContent('3')

    expect(screen.getByRole('heading', { name: 'Progress' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Most reps at each weight' })).toBeInTheDocument()
    const history = screen.getByRole('heading', { name: 'History' }).closest('section')!
    expect(
      within(history)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual([
      'Today10 @ 55 kg',
      expect.stringContaining('2×5 @ 60 kg'),
      expect.stringContaining('2×5 @ 50 kg'),
    ])
  })

  it('handles an exercise with no sets', async () => {
    renderAt('/workouts/exercises/ex_squat')
    expect(await screen.findByText('No sets logged yet')).toBeInTheDocument()
  })

  it('reports a missing exercise', async () => {
    renderAt('/workouts/exercises/nope')
    expect(await screen.findByText('Exercise not found')).toBeInTheDocument()
  })
})
