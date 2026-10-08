import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallHint } from '@/features/dashboard/install-hint'
import { isIos, isStandalone } from '@/lib/platform'

vi.mock('@/lib/platform', () => ({ isIos: vi.fn(), isStandalone: vi.fn() }))

afterEach(() => localStorage.clear())

describe('install hint', () => {
  it('explains Add to Home Screen in iOS Safari, until dismissed', async () => {
    vi.mocked(isIos).mockReturnValue(true)
    vi.mocked(isStandalone).mockReturnValue(false)
    const { unmount } = render(<InstallHint />)
    expect(
      screen.getByRole('heading', { name: 'Add grindOS to your Home Screen' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Choose Add to Home Screen.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    unmount()
    render(<InstallHint />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('stays out of the way once installed, or off iOS', () => {
    vi.mocked(isIos).mockReturnValue(true)
    vi.mocked(isStandalone).mockReturnValue(true)
    const { container, rerender } = render(<InstallHint key="a" />)
    expect(container).toBeEmptyDOMElement()

    vi.mocked(isIos).mockReturnValue(false)
    vi.mocked(isStandalone).mockReturnValue(false)
    rerender(<InstallHint key="b" />)
    expect(container).toBeEmptyDOMElement()
  })
})
