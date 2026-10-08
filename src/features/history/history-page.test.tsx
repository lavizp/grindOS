import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { db, repositories } from '@/db'
import { addDaysToKey, todayKey } from '@/lib/dates'
import { useAppStore } from '@/stores/app-store'

function renderHistory() {
  const router = createMemoryRouter(routes, { initialEntries: ['/', '/history'], initialIndex: 1 })
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

const today = todayKey()
const yesterday = addDaysToKey(today, -1)
// Month view keeps yesterday in range even on the first day of a week.
const sameMonth = yesterday.slice(0, 7) === today.slice(0, 7)

async function seed() {
  const workout = await repositories.workouts.create({
    date: today,
    name: 'Legs',
    unit: 'kg',
    startTime: '07:30',
    entries: [{ exerciseId: 'ex_squat', sets: [{ reps: 5, weight: 100 }] }],
  })
  await repositories.sleep.create({
    date: today,
    bedtime: `${yesterday}T23:00`,
    wakeTime: `${today}T06:30`,
  })
  const lunch = await repositories.payments.create({
    date: today,
    amountMinor: 45000,
    categoryId: 'cat_food',
    merchant: 'Momo House',
  })
  await repositories.payments.create({
    date: today,
    amountMinor: 20000,
    categoryId: 'cat_transport',
    merchant: 'Pathao',
  })
  await repositories.payments.create({
    date: yesterday,
    amountMinor: 99000,
    categoryId: 'cat_bills',
    merchant: 'NEA',
  })
  return { workout, lunch }
}

const day = (name: string) =>
  screen.getByRole('heading', { level: 2, name }).closest('section')! as HTMLElement

beforeEach(() => {
  useAppStore.getState().resetHistoryFilters()
  useAppStore.getState().setHistorySpan('month')
})

afterEach(async () => {
  await Promise.all([db.workouts.clear(), db.sleep.clear(), db.payments.clear()])
})

describe('history page', () => {
  it('invites logging when there’s nothing yet', async () => {
    renderHistory()
    expect(
      await screen.findByRole('heading', { name: 'Nothing logged this month' }),
    ).toBeInTheDocument()
  })

  it('lists everything by day, with each day’s spending', async () => {
    await seed()
    renderHistory()
    const todayCard = await screen
      .findByRole('heading', { level: 2, name: 'Today' })
      .then(() => day('Today'))
    expect(
      within(todayCard)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual([
      expect.stringContaining('Pathao'),
      expect.stringContaining('Momo House'),
      expect.stringContaining('Legs'),
      expect.stringContaining('Last night'),
    ])
    expect(todayCard).toHaveTextContent(/650 spent/)
    if (sameMonth) expect(day('Yesterday')).toHaveTextContent('NEA')
  })

  it('filters by type and by payment category', async () => {
    await seed()
    const { user } = renderHistory()
    await screen.findByRole('heading', { level: 2, name: 'Today' })

    await user.click(screen.getByRole('button', { name: 'Sleep' }))
    expect(screen.queryByRole('link', { name: /Last night/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sleep' })).toHaveAttribute('aria-pressed', 'false')

    const categories = screen.getByRole('group', { name: 'Payment category' })
    await user.click(within(categories).getByRole('button', { name: 'Food' }))
    expect(screen.getByRole('link', { name: /Momo House/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Pathao/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /NEA/ })).not.toBeInTheDocument()
    // Other types aren't affected by the category.
    expect(screen.getByRole('link', { name: /Legs/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show everything' }))
    expect(screen.getByRole('link', { name: /Last night/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pathao/ })).toBeInTheDocument()
  })

  it('hides the category filter when payments are hidden', async () => {
    const { user } = renderHistory()
    await user.click(await screen.findByRole('button', { name: 'Payments' }))
    expect(screen.queryByRole('group', { name: 'Payment category' })).not.toBeInTheDocument()
  })

  it('says when filters leave nothing', async () => {
    await repositories.sleep.create({
      date: today,
      bedtime: `${yesterday}T23:00`,
      wakeTime: `${today}T06:30`,
    })
    const { user } = renderHistory()
    await screen.findByRole('link', { name: /Last night/ })
    await user.click(screen.getByRole('button', { name: 'Sleep' }))
    expect(
      screen.getByRole('heading', { name: 'Nothing matches these filters' }),
    ).toBeInTheDocument()
  })

  it('steps through single days', async () => {
    await seed()
    const { user } = renderHistory()
    await screen.findByRole('heading', { level: 2, name: 'Today' })
    await user.click(screen.getByRole('radio', { name: 'Day' }))

    expect(await screen.findByText('Today', { selector: '[aria-live]' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('NEA')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(await screen.findByRole('link', { name: /NEA/ })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /Legs/ })).not.toBeInTheDocument(),
    )
  })

  it('opens an entry for editing and comes back', async () => {
    const { lunch } = await seed()
    const { router, user } = renderHistory()
    await user.click(await screen.findByRole('link', { name: /Momo House/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/spending/${lunch.id}`))
    expect(await screen.findByRole('dialog', { name: 'Edit payment' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/history'))
  })
})
