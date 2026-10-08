import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { db, repositories } from '@/db'
import { todayKey } from '@/lib/dates'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, {
    initialEntries: ['/spending', path],
    initialIndex: 1,
  })
  render(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
  )
  return { router, user: userEvent.setup() }
}

afterEach(async () => {
  await db.payments.clear()
})

describe('payment sheet', () => {
  it('requires an amount and a category', async () => {
    const { user } = renderAt('/spending/new')
    await screen.findByLabelText('Amount')
    await user.click(screen.getByRole('button', { name: 'Save payment' }))
    expect(await screen.findByText('Enter an amount')).toBeInTheDocument()
    expect(screen.getByText('Pick a category')).toBeInTheDocument()
    expect(await db.payments.count()).toBe(0)
  })

  it('adds a payment with amount and category alone, and can undo', async () => {
    const { router, user } = renderAt('/spending/new')
    const amount = await screen.findByLabelText('Amount')
    expect(amount).toHaveFocus()
    await user.type(amount, '1,250.50')
    await user.click(screen.getByRole('radio', { name: 'Food' }))
    await user.click(screen.getByRole('button', { name: 'Save payment' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/spending'))
    const [saved] = await db.payments.toArray()
    expect(saved).toMatchObject({ amountMinor: 125050, categoryId: 'cat_food', date: todayKey() })
    expect(saved.merchant).toBeUndefined()

    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect(await db.payments.count()).toBe(0))
  })

  it('suggests recent merchants and fills in their category', async () => {
    await repositories.payments.create({
      date: todayKey(),
      amountMinor: 500,
      categoryId: 'cat_transport',
      merchant: 'Pathao',
    })
    const { user } = renderAt('/spending/new')
    await user.type(await screen.findByLabelText('Amount'), '300')
    await user.type(screen.getByLabelText('Merchant or description'), 'pat')
    await user.click(screen.getByRole('button', { name: 'Pathao' }))

    expect(screen.getByLabelText('Merchant or description')).toHaveValue('Pathao')
    expect(screen.getByRole('radio', { name: 'Transport' })).toHaveAttribute('aria-checked', 'true')
  })

  it('edits a payment', async () => {
    const payment = await repositories.payments.create({
      date: '2026-10-01',
      amountMinor: 99950,
      categoryId: 'cat_bills',
      merchant: 'NEA',
    })
    const { router, user } = renderAt(`/spending/${payment.id}`)
    const amount = await screen.findByLabelText('Amount')
    expect(amount).toHaveValue('999.5')
    await user.clear(amount)
    await user.type(amount, '1200')
    await user.clear(screen.getByLabelText('Merchant or description'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/spending'))
    const updated = await repositories.payments.getById(payment.id)
    expect(updated).toMatchObject({ amountMinor: 120000, categoryId: 'cat_bills' })
    expect(updated?.merchant).toBeUndefined()
  })

  it('deletes after confirmation', async () => {
    const payment = await repositories.payments.create({
      date: '2026-10-01',
      amountMinor: 100,
      categoryId: 'cat_food',
    })
    const { router, user } = renderAt(`/spending/${payment.id}`)
    await user.click(await screen.findByRole('button', { name: 'Delete payment' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this payment?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/spending'))
    expect(await repositories.payments.getById(payment.id)).toBeUndefined()
  })

  it('explains when the payment no longer exists', async () => {
    renderAt('/spending/missing')
    expect(await screen.findByText(/doesn’t exist anymore/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })
})
