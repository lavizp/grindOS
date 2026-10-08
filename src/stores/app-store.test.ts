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

  it('sets the history span', () => {
    useAppStore.getState().setHistorySpan('day')
    expect(useAppStore.getState().historyFilters).toMatchObject({ span: 'day' })
  })

  it('fills in the history span when upgrading saved v1 state', async () => {
    localStorage.setItem(
      'grindos-ui',
      JSON.stringify({
        state: { period: 'month', historyFilters: { types: ['sleep'], categoryId: null } },
        version: 1,
      }),
    )
    await useAppStore.persist.rehydrate()
    expect(useAppStore.getState()).toMatchObject({
      period: 'month',
      historyFilters: { span: 'week', types: ['sleep'], categoryId: null },
    })
  })
})
