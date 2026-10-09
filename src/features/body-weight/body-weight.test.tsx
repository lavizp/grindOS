import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { db, repositories } from '@/db'
import { addDaysToKey, todayKey } from '@/lib/dates'

function renderAt(...paths: string[]) {
  const router = createMemoryRouter(routes, {
    initialEntries: paths,
    initialIndex: paths.length - 1,
  })
  render(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
  )
  return { router, user: userEvent.setup() }
}

const today = todayKey()

afterEach(async () => {
  await db.bodyWeights.clear()
})

describe('body weight', () => {
  it('is empty by default', async () => {
    renderAt('/workouts/body-weight')
    expect(await screen.findByText('No weigh-ins yet')).toBeInTheDocument()
  })

  it('logs today’s weight', async () => {
    const { router, user } = renderAt('/workouts/body-weight', '/workouts/body-weight/new')
    const sheet = await screen.findByRole('dialog', { name: 'Log body weight' })
    await user.type(await within(sheet).findByLabelText('Weight'), '78,6')
    await user.click(within(sheet).getByRole('button', { name: 'Save weight' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/workouts/body-weight'))
    expect(await repositories.bodyWeights.listAll()).toMatchObject([
      { date: today, weight: 78.6, unit: 'kg' },
    ])
  })

  it('needs a weight', async () => {
    const { user } = renderAt('/workouts/body-weight', '/workouts/body-weight/new')
    const sheet = await screen.findByRole('dialog', { name: 'Log body weight' })
    await within(sheet).findByLabelText('Weight')
    await user.click(within(sheet).getByRole('button', { name: 'Save weight' }))
    expect(await within(sheet).findByText('Enter your weight')).toBeInTheDocument()
  })

  it('opens today’s entry instead of logging today twice', async () => {
    const entry = await repositories.bodyWeights.create({ date: today, weight: 80, unit: 'kg' })
    const { router } = renderAt('/workouts/body-weight', '/workouts/body-weight/new')
    expect(await screen.findByRole('dialog', { name: 'Edit body weight' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/workouts/body-weight/${entry.id}`)
  })

  it('shows the latest weight and the change over 30 days', async () => {
    await repositories.bodyWeights.create({
      date: addDaysToKey(today, -20),
      weight: 82,
      unit: 'kg',
    })
    await repositories.bodyWeights.create({ date: today, weight: 80.5, unit: 'kg' })
    renderAt('/workouts/body-weight')

    expect(await screen.findByText('Down 1.5 kg in 30 days')).toBeInTheDocument()
    expect(screen.getByText(/^Logged today/)).toBeInTheDocument()
  })

  it('is in the add menu', async () => {
    const { router, user } = renderAt('/')
    await user.click(await screen.findByRole('button', { name: 'Add entry' }))
    await user.click(await screen.findByRole('button', { name: /Log body weight/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/workouts/body-weight/new'))
  })
})
