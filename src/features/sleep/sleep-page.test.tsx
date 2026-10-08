import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { db, repositories } from '@/db'
import { addDaysToKey, todayKey } from '@/lib/dates'
import { formatTimeOfDay } from '@/lib/formatters'
import { useAppStore } from '@/stores/app-store'

function renderSleep() {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/sleep'] })} />)
}

async function logNight(wakeDay: string, bed: string, wake: string, quality?: number) {
  const bedDay = bed > wake ? addDaysToKey(wakeDay, -1) : wakeDay
  return repositories.sleep.create({
    date: wakeDay,
    bedtime: `${bedDay}T${bed}`,
    wakeTime: `${wakeDay}T${wake}`,
    quality,
  })
}

const today = todayKey()
const clock = (h: number, m = 0) => formatTimeOfDay(h * 60 + m)

beforeEach(() => {
  // Month view, so nights from the past few days are always in range.
  useAppStore.setState({ period: 'month' })
})

afterEach(async () => {
  await db.sleep.clear()
})

describe('sleep page', () => {
  it('invites the first entry when nothing is logged', async () => {
    renderSleep()
    expect(
      await screen.findByRole('heading', { name: 'No nights logged this month' }),
    ).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: 'Log sleep' })) {
      expect(link).toHaveAttribute('href', '/sleep/new')
    }
  })

  it('shows last night, the average against the target and the nights', async () => {
    await logNight(today, '23:00', '06:30', 4) // 7h 30m
    renderSleep()

    const lastNight = (await screen.findByRole('heading', { name: 'Last night' })).closest(
      'section',
    )!
    expect(lastNight).toHaveTextContent('7h 30m')
    expect(lastNight).toHaveTextContent(`${clock(23)} to ${clock(6, 30)}, Good`)
    expect(screen.getByText('30m under your 8h target')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Last night/ })).toBeInTheDocument()
  })

  it('asks for last night when it’s missing', async () => {
    if (today.slice(8) === '01') return // the only earlier night would be last month
    await logNight(addDaysToKey(today, -1), '23:00', '07:00')
    renderSleep()
    expect(await screen.findByText('Last night isn’t logged yet')).toBeInTheDocument()
  })

  it('summarizes consistency and the longest and shortest nights', async () => {
    if (Number(today.slice(8)) < 3) return // needs three nights in this month
    await logNight(today, '23:30', '07:00')
    await logNight(addDaysToKey(today, -1), '00:30', '07:00')
    await logNight(addDaysToKey(today, -2), '22:00', '07:00', 5)
    renderSleep()

    expect(await screen.findByText('Usual bedtime')).toBeInTheDocument()
    expect(screen.getByText('Usual wake time')).toBeInTheDocument()
    // 23:30, 00:30 and 22:00 average to 23:20; wake time never varies.
    expect(screen.getByText(clock(23, 20))).toBeInTheDocument()
    expect(screen.getByText(clock(7))).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Longest night/ })).toHaveTextContent('9h')
    expect(screen.getByRole('link', { name: /Shortest night/ })).toHaveTextContent('6h 30m')
    expect(screen.getByText('3 nights')).toBeInTheDocument()
  })
})
