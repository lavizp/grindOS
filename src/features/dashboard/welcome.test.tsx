import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { db, repositories } from '@/db'
import { deleteAllData } from '@/db/backup'

function renderHome() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] })
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

afterEach(async () => {
  await deleteAllData(db)
})

describe('welcome', () => {
  it('greets a fresh install, confirms the currency, and gets out of the way', async () => {
    const { user } = renderHome()
    expect(await screen.findByRole('heading', { name: 'Welcome to grindOS' })).toBeInTheDocument()
    const currency = screen.getByLabelText('Currency')
    expect(currency).toHaveValue('NPR')

    await user.selectOptions(currency, 'EUR')
    await user.click(screen.getByRole('radio', { name: 'lb' }))
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()
    const settings = await repositories.settings.get()
    expect(settings).toMatchObject({ currency: 'EUR', weightUnit: 'lb' })
    expect(settings.onboardedAt).toBeDefined()
  })

  it('offers restoring a backup instead', async () => {
    const { router, user } = renderHome()
    await user.click(await screen.findByRole('link', { name: 'Restore from a backup' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings'))
  })

  it('skips the welcome for someone who already has data', async () => {
    await repositories.payments.create({
      date: '2026-10-01',
      amountMinor: 100,
      categoryId: 'cat_food',
    })
    renderHome()
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Welcome to grindOS' })).not.toBeInTheDocument()
  })
})
