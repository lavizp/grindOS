import { act, renderHook, waitFor } from '@testing-library/react'
import { db, repositories } from '@/db'
import { useCategories, usePayments } from '@/hooks/use-data'

afterEach(async () => {
  await db.payments.clear()
})

describe('data hooks', () => {
  it('loads seeded categories', async () => {
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current).toHaveLength(9))
  })

  it('re-renders when matching records change', async () => {
    const range = { start: '2026-10-01', end: '2026-10-31' }
    const { result } = renderHook(() => usePayments(range))
    await waitFor(() => expect(result.current).toEqual([]))

    await act(async () => {
      await repositories.payments.create({
        date: '2026-10-07',
        amountMinor: 5000,
        categoryId: 'cat_food',
      })
    })

    await waitFor(() => expect(result.current).toHaveLength(1))
  })
})
