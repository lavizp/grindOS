import { useAppStore } from '@/stores/app-store'

beforeEach(() => {
  useAppStore.getState().resetHistoryFilters()
})

describe('app store', () => {
  it('toggles history types and keeps a stable order', () => {
    const { toggleHistoryType } = useAppStore.getState()
    toggleHistoryType('sleep')
    expect(useAppStore.getState().historyFilters.types).toEqual(['workout', 'payment'])
    toggleHistoryType('sleep')
    expect(useAppStore.getState().historyFilters.types).toEqual(['workout', 'sleep', 'payment'])
  })

  it('never leaves the type filter empty', () => {
    const { toggleHistoryType } = useAppStore.getState()
    toggleHistoryType('workout')
    toggleHistoryType('sleep')
    toggleHistoryType('payment')
    expect(useAppStore.getState().historyFilters.types).toEqual(['payment'])
  })

  it('persists UI preferences to localStorage', () => {
    useAppStore.getState().setPeriod('month')
    const stored = JSON.parse(localStorage.getItem('grindos-ui') ?? '{}')
    expect(stored.state).toMatchObject({ period: 'month' })
    expect(stored.state).not.toHaveProperty('setPeriod')
  })
})
