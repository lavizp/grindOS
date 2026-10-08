import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { db, repositories } from '@/db'
import { addDaysToKey, todayKey } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

function renderDashboard() {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />)
}

const today = todayKey()
// Matchers normalize the non-breaking space after the symbol; do the same here.
const money = (minor: number) => formatMoney(minor, 'NPR').replace(/\u00a0/g, ' ')

function section(name: string) {
  return screen.getByRole('heading', { name }).closest('section, a')! as HTMLElement
}

afterEach(async () => {
  await Promise.all([db.workouts.clear(), db.sleep.clear(), db.payments.clear()])
  await repositories.settings.update({ lastBackupAt: undefined })
})

describe('dashboard', () => {
  it('offers the three quick actions', async () => {
    renderDashboard()
    const actions = await screen.findByRole('navigation', { name: 'Quick actions' })
    expect(within(actions).getByRole('link', { name: 'Log workout' })).toHaveAttribute(
      'href',
      '/workouts/new',
    )
    expect(within(actions).getByRole('link', { name: 'Log sleep' })).toHaveAttribute(
      'href',
      '/sleep/new',
    )
    expect(within(actions).getByRole('link', { name: 'Add payment' })).toHaveAttribute(
      'href',
      '/spending/new',
    )
  })

  it('shows an empty day, with no backup nudge before anything is logged', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()
    const today = section('Today')
    expect(within(today).getByRole('link', { name: /Workout\s*Not yet/ })).toHaveAttribute(
      'href',
      '/workouts/new',
    )
    expect(within(today).getByText('Last night isn’t logged')).toBeInTheDocument()
    expect(within(today).getByText('Nothing spent')).toBeInTheDocument()
    expect(screen.getByText('Nothing spent this month yet')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Back up' })).not.toBeInTheDocument()
  })

  it('summarizes today', async () => {
    const workout = await repositories.workouts.create({
      date: today,
      name: 'Push',
      unit: 'kg',
      durationMin: 55,
      entries: [],
    })
    const night = await repositories.sleep.create({
      date: today,
      bedtime: `${addDaysToKey(today, -1)}T23:00`,
      wakeTime: `${today}T06:45`,
      quality: 4,
    })
    // Rs 300 a day over the previous 30 days; Rs 400 today.
    await repositories.payments.create({
      date: addDaysToKey(today, -10),
      amountMinor: 900000,
      categoryId: 'cat_bills',
    })
    await repositories.payments.create({ date: today, amountMinor: 40000, categoryId: 'cat_food' })
    renderDashboard()

    const card = await screen.findByRole('heading', { name: 'Today' }).then(() => section('Today'))
    expect(within(card).getByRole('link', { name: /Push.*55m/ })).toHaveAttribute(
      'href',
      `/workouts/${workout.id}`,
    )
    expect(within(card).getByRole('link', { name: /7h 45m.*Good/ })).toHaveAttribute(
      'href',
      `/sleep/${night.id}`,
    )
    expect(within(card).getByRole('link', { name: /Spending/ })).toHaveTextContent(
      `${money(40000)}${money(10000)} over a usual day`,
    )
  })

  it('compares this week and summarizes the month', async () => {
    await repositories.payments.create({ date: today, amountMinor: 30000, categoryId: 'cat_food' })
    await repositories.payments.create({
      date: today,
      amountMinor: 10000,
      categoryId: 'cat_transport',
    })
    // Same weekday last week: Rs 200, so this week is 100% more.
    await repositories.payments.create({
      date: addDaysToKey(today, -7),
      amountMinor: 20000,
      categoryId: 'cat_food',
    })
    renderDashboard()

    const week = await screen
      .findByRole('heading', { name: 'This week' })
      .then(() => section('This week'))
    expect(week).toHaveTextContent('100% more than last week')
    expect(week).toHaveTextContent('So far') // no workout history to compare with
    expect(screen.getByText(/^Mostly Food, \d+%$/)).toBeInTheDocument()
  })

  it('nudges for a backup after two weeks', async () => {
    await repositories.payments.create({
      date: addDaysToKey(today, -20),
      amountMinor: 100,
      categoryId: 'cat_food',
    })
    renderDashboard()
    expect(await screen.findByText('You haven’t backed up yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back up' })).toHaveAttribute('href', '/settings')
  })

  it('leaves out the nudge after a recent backup', async () => {
    await repositories.payments.create({
      date: addDaysToKey(today, -20),
      amountMinor: 100,
      categoryId: 'cat_food',
    })
    await repositories.settings.update({ lastBackupAt: Date.now() - 3 * 86_400_000 })
    renderDashboard()
    await screen.findByRole('heading', { name: 'Today' })
    expect(screen.queryByRole('link', { name: 'Back up' })).not.toBeInTheDocument()
  })
})
