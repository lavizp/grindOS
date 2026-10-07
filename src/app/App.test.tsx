import { render, screen } from '@testing-library/react'
import { App } from '@/app/App'

describe('App', () => {
  it('renders the app name', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'grindOS' })).toBeInTheDocument()
  })

  it('has IndexedDB available in tests', () => {
    expect(globalThis.indexedDB).toBeDefined()
  })
})
