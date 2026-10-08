import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { UpdatePrompt } from '@/app/update-prompt'
import { Toaster } from '@/components/ui/sonner'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: vi.fn() }))

function registerWith({ needRefresh = false, offlineReady = false }) {
  const updateServiceWorker = vi.fn(async () => {})
  vi.mocked(useRegisterSW).mockReturnValue({
    needRefresh: [needRefresh, vi.fn()],
    offlineReady: [offlineReady, vi.fn()],
    updateServiceWorker,
  })
  render(
    <>
      <UpdatePrompt />
      <Toaster />
    </>,
  )
  return updateServiceWorker
}

describe('update prompt', () => {
  it('offers to reload into a new version', async () => {
    const update = registerWith({ needRefresh: true })
    expect(await screen.findByText('A new version of grindOS is ready')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(update).toHaveBeenCalledWith(true)
  })

  it('says when the app is ready offline', async () => {
    registerWith({ offlineReady: true })
    expect(await screen.findByText('grindOS now works offline')).toBeInTheDocument()
  })

  it('stays quiet otherwise', () => {
    registerWith({})
    expect(screen.queryByText(/new version/)).not.toBeInTheDocument()
  })
})
