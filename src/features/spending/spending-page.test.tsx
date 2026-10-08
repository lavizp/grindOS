import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { db, repositories } from '@/db'
import { addDaysToKey, todayKey, weekRange } from '@/lib/dates'
import { useAppStore } from '@/stores/app-store'

function renderSpending() {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/spending'] })} />)
}

const plain = (text: string | null) => text?.replace(/\s/g, ' ')

beforeEach(() => {
  useAppStore.setState({ period: 'week' })
})

afterEach(async () => {
  await db.payments.clear()
})

describe('spending page', () => {
  it('invites the first payment when the week is empty', async () => {
    renderSpending()
    expect(
      await screen.findByRole('heading', { name: 'Nothing spent this week' }),
    ).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: 'Add payment' })) {
      expect(link).toHaveAttribute('href', '/spending/new')
    }
  })

  it('summarizes the week', async () => {
    const today = todayKey()
    const weekStart = weekRange(today, 0).start
    await repositories.payments.create({
      date: today,
      amountMinor: 30000,
      categoryId: 'cat_food',
      merchant: 'Momo',
    })
    await repositories.payments.create({
      date: today,
      amountMinor: 10000,
      categoryId: 'cat_transport',
    })
    // Same weekday last week: half as much, so this week is 100% more.
    await repositories.payments.create({
      date: addDaysToKey(today, -7),
      amountMinor: 20000,
      categoryId: 'cat_food',
    })
    // Before the comparable window last week; must not count.
    if (weekStart !== today) {
      await repositories.payments.create({
        date: addDaysToKey(today, -6),
        amountMinor: 99900,
        categoryId: 'cat_food',
      })
    }

    renderSpending()
    const hero = (await screen.findByRole('heading', { name: 'Spent this week' })).closest(
      'section',
    )!
    expect(plain(hero.textContent)).toContain('Rs 400')
    expect(hero).toHaveTextContent('100% more than this point last week')

    const breakdown = screen.getByRole('heading', { name: 'Where it went' }).closest('section')!
    expect(within(breakdown).getByText('Food')).toBeInTheDocument()
    expect(within(breakdown).getByText('75%')).toBeInTheDocument()

    const list = screen.getByRole('heading', { name: 'Payments' }).closest('section')!
    expect(within(list).getByRole('link', { name: /Momo/ })).toBeInTheDocument()
    expect(within(list).getByRole('heading', { name: 'Today' })).toBeInTheDocument()
  })

  it('goes back a week', async () => {
    await repositories.payments.create({
      date: addDaysToKey(todayKey(), -7),
      amountMinor: 5000,
      categoryId: 'cat_food',
    })
    renderSpending()
    await screen.findByRole('heading', { name: 'Nothing spent this week' })
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(await screen.findByText('Last week')).toBeInTheDocument()
    expect(
      plain(
        (await screen.findByRole('heading', { name: 'Spent' })).closest('section')!.textContent,
      ),
    ).toContain('Rs 50')
  })
})
