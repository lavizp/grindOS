import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { db, repositories } from '@/db'
import { addDaysToKey, todayKey } from '@/lib/dates'

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

const today = todayKey()

/** Five short nights: enough for the "under target" insight. */
async function logShortWeek() {
  for (let i = 0; i < 5; i++) {
    const day = addDaysToKey(today, -i)
    await repositories.sleep.create({
      date: day,
      bedtime: `${addDaysToKey(day, -1)}T23:30`,
      wakeTime: `${day}T06:00`,
    })
  }
}

afterEach(async () => {
  await Promise.all([db.workouts.clear(), db.sleep.clear(), db.payments.clear()])
})

describe('insights page', () => {
  it('explains that insights need more data', async () => {
    renderAt('/insights')
    expect(await screen.findByRole('heading', { name: 'Not enough data yet' })).toBeInTheDocument()
  })

  it('groups insights by area, linking to where to look closer', async () => {
    await logShortWeek()
    renderAt('/insights')
    const sleep = (await screen.findByRole('heading', { name: 'Sleep' })).closest('section')!
    const link = within(sleep).getByRole('link', { name: /averaging 6h 30m a night/ })
    expect(link).toHaveAttribute('href', '/sleep')
    expect(link).toHaveTextContent('Worth a look')
    expect(link).toHaveTextContent('1h 30m under your 8h target')
    expect(screen.queryByRole('heading', { name: 'Spending' })).not.toBeInTheDocument()
  })
})

describe('dashboard insights', () => {
  beforeEach(async () => {
    await repositories.settings.update({ onboardedAt: 1 })
  })

  it('shows the top insights with a link to all of them', async () => {
    await logShortWeek()
    renderAt('/')
    const card = (await screen.findByRole('heading', { name: 'Insights' })).closest('section')!
    expect(within(card).getByRole('link', { name: /averaging 6h 30m/ })).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /See all/ })).toHaveAttribute('href', '/insights')
  })

  it('leaves the card out when there’s nothing to say', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: 'Today' })
    expect(screen.queryByRole('heading', { name: 'Insights' })).not.toBeInTheDocument()
  })
})
