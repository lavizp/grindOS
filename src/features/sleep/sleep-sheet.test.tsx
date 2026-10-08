import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { db, repositories } from '@/db'
import { addDaysToKey, todayKey } from '@/lib/dates'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: ['/sleep', path], initialIndex: 1 })
  render(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
  )
  return { router, user: userEvent.setup() }
}

const today = todayKey()
const yesterday = addDaysToKey(today, -1)

afterEach(async () => {
  await db.sleep.clear()
})

describe('sleep sheet', () => {
  it('logs last night with the default times, and can undo', async () => {
    const { router, user } = renderAt('/sleep/new')
    expect(await screen.findByLabelText('Went to bed')).toHaveValue('23:00')
    expect(screen.getByLabelText('Woke up')).toHaveValue('07:00')
    expect(screen.getByText('8h')).toBeInTheDocument()
    expect(screen.getByText(/right on target/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Good' }))
    await user.click(screen.getByRole('button', { name: 'Save sleep' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sleep'))
    expect(await db.sleep.toArray()).toMatchObject([
      { date: today, bedtime: `${yesterday}T23:00`, wakeTime: `${today}T07:00`, quality: 4 },
    ])

    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect(await db.sleep.count()).toBe(0))
  })

  it('updates the duration preview as times change', async () => {
    const { user } = renderAt('/sleep/new')
    const bedtime = await screen.findByLabelText('Went to bed')
    await user.clear(bedtime)
    await user.type(bedtime, '00:30')
    expect(screen.getByText('6h 30m')).toBeInTheDocument()
    expect(screen.getByText(/1h 30m under target/)).toBeInTheDocument()
  })

  it('starts from the times of the latest entry', async () => {
    await repositories.sleep.create({
      date: addDaysToKey(today, -3),
      bedtime: `${addDaysToKey(today, -3)}T00:15`,
      wakeTime: `${addDaysToKey(today, -3)}T06:45`,
    })
    renderAt('/sleep/new')
    expect(await screen.findByLabelText('Went to bed')).toHaveValue('00:15')
    expect(screen.getByLabelText('Woke up')).toHaveValue('06:45')
  })

  it('opens last night for editing when it is already logged', async () => {
    const entry = await repositories.sleep.create({
      date: today,
      bedtime: `${yesterday}T22:30`,
      wakeTime: `${today}T06:30`,
    })
    const { router } = renderAt('/sleep/new')
    expect(await screen.findByRole('dialog', { name: 'Edit sleep' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/sleep/${entry.id}`)
    expect(await screen.findByLabelText('Went to bed')).toHaveValue('22:30')
  })

  it('won’t log a second entry for the same night', async () => {
    const other = await repositories.sleep.create({
      date: yesterday,
      bedtime: `${addDaysToKey(today, -2)}T23:00`,
      wakeTime: `${yesterday}T07:00`,
    })
    const { router, user } = renderAt('/sleep/new')
    await screen.findByLabelText('Went to bed')
    await user.click(screen.getByRole('button', { name: 'Night before' }))

    expect(await screen.findByText('This night is already logged')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Edit that night' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/sleep/${other.id}`))
  })

  it('edits and deletes a night', async () => {
    const entry = await repositories.sleep.create({
      date: yesterday,
      bedtime: `${addDaysToKey(today, -2)}T23:00`,
      wakeTime: `${yesterday}T07:00`,
      quality: 2,
    })
    const { router, user } = renderAt(`/sleep/${entry.id}`)
    expect(await screen.findByRole('radio', { name: 'Poor' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    // Tapping the chosen quality again clears it.
    await user.click(screen.getByRole('radio', { name: 'Poor' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/sleep'))
    expect((await repositories.sleep.getById(entry.id))?.quality).toBeUndefined()

    await router.navigate(`/sleep/${entry.id}`)
    await user.click(await screen.findByRole('button', { name: 'Delete sleep' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this night?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect(await db.sleep.count()).toBe(0))
  })

  it('explains when the night no longer exists', async () => {
    renderAt('/sleep/missing')
    expect(await screen.findByText(/doesn’t exist anymore/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })
})
