import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ID } from '@/db/schema'

// UI state only. Records live in Dexie; settings live in the settings table.

export type Period = 'week' | 'month'
export type EntryType = 'workout' | 'sleep' | 'payment'

export const ALL_ENTRY_TYPES: EntryType[] = ['workout', 'sleep', 'payment']

export interface HistoryFilters {
  types: EntryType[]
  categoryId: ID | null
}

interface AppState {
  period: Period
  historyFilters: HistoryFilters
  setPeriod: (period: Period) => void
  toggleHistoryType: (type: EntryType) => void
  setHistoryCategory: (categoryId: ID | null) => void
  resetHistoryFilters: () => void
}

const DEFAULT_HISTORY_FILTERS: HistoryFilters = { types: ALL_ENTRY_TYPES, categoryId: null }

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      period: 'week',
      historyFilters: DEFAULT_HISTORY_FILTERS,
      setPeriod: (period) => set({ period }),
      toggleHistoryType: (type) =>
        set(({ historyFilters }) => {
          const has = historyFilters.types.includes(type)
          // Never allow an empty selection; it would just show nothing.
          if (has && historyFilters.types.length === 1) return {}
          const types = has
            ? historyFilters.types.filter((t) => t !== type)
            : ALL_ENTRY_TYPES.filter((t) => t === type || historyFilters.types.includes(t))
          return { historyFilters: { ...historyFilters, types } }
        }),
      setHistoryCategory: (categoryId) =>
        set(({ historyFilters }) => ({ historyFilters: { ...historyFilters, categoryId } })),
      resetHistoryFilters: () => set({ historyFilters: DEFAULT_HISTORY_FILTERS }),
    }),
    {
      name: 'grindos-ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ period, historyFilters }) => ({ period, historyFilters }),
    },
  ),
)
