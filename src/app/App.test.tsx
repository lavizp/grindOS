import { render, screen } from '@testing-library/react'
import { App } from '@/app/App'

describe('App', () => {
  it('opens on the dashboard', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/^Good /)
    expect(screen.getByRole('button', { name: 'Add entry' })).toBeInTheDocument()
  })

  it('has IndexedDB available in tests', () => {
    expect(globalThis.indexedDB).toBeDefined()
  })
})
