import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { repositories } from '@/db'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(async () => {
  await repositories.settings.update({ onboardedAt: 1 })
})

describe('app shell', () => {
  it.each([
    ['/', /good (morning|afternoon|evening|night)/i],
    ['/workouts', 'Workout'],
    ['/sleep', 'Sleep'],
    ['/spending', 'Spending'],
    ['/history', 'History'],
    ['/insights', 'Insights'],
    ['/settings', 'Settings'],
  ])('renders %s', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('shows a not-found page inside the shell', async () => {
    renderAt('/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it.each([
    ['/workouts/new', 'Log workout', 'Workout'],
    ['/sleep/abc', 'Edit sleep', 'Sleep'],
    ['/spending/new', 'Add payment', 'Spending'],
  ])('opens %s as a sheet over its page', async (path, title, page) => {
    renderAt(path)
    expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: page, hidden: true })).toBeInTheDocument()
  })

  it('closes an entry sheet back to its page', async () => {
    const router = renderAt('/spending/new')
    await screen.findByRole('dialog', { name: 'Add payment' })
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/spending'))
  })

  it('marks the active tab', async () => {
    renderAt('/sleep')
    await screen.findByRole('heading', { level: 1, name: 'Sleep' })
    expect(screen.getByRole('link', { name: 'Sleep' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('opens quick add and goes to the chosen form', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(await screen.findByRole('button', { name: 'Add entry' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add entry' })
    expect(sheet).toHaveTextContent('Log workout')
    expect(sheet).toHaveTextContent('Log sleep')
    await user.click(screen.getByRole('button', { name: /add payment/i }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/spending/new'))
    expect(await screen.findByRole('dialog', { name: 'Add payment' })).toBeInTheDocument()
  })
})
