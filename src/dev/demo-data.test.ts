import { seedDemoData } from '@/dev/demo-data'
import { exportBackup } from '@/db/backup'
import { getInsights } from '@/lib/calculations/insights'
import { createTestDb } from '@/test/db'

const today = '2026-10-08'

describe('demo data', () => {
  it('fills about three months with valid, linked records', async () => {
    const { db, repos } = createTestDb()
    const summary = await seedDemoData(repos, { today, days: 90 })

    expect(summary.workouts).toBeGreaterThan(30)
    expect(summary.nights).toBeGreaterThan(70)
    expect(summary.payments).toBeGreaterThan(100)
    expect(summary.weighIns).toBeGreaterThan(60)
    expect(await db.payments.count()).toBe(summary.payments)

    const { data } = await exportBackup(db)
    const exerciseIds = new Set(data.exercises.map((e) => e.id))
    const categoryIds = new Set(data.categories.map((c) => c.id))
    expect(data.workouts.every((w) => w.exerciseIds.every((id) => exerciseIds.has(id)))).toBe(true)
    expect(data.payments.every((p) => categoryIds.has(p.categoryId))).toBe(true)
    expect(data.workouts.every((w) => w.date <= today)).toBe(true)
  })

  it('is the same every time for a seed', async () => {
    const a = createTestDb()
    const b = createTestDb()
    await seedDemoData(a.repos, { today, days: 30, seed: 3 })
    await seedDemoData(b.repos, { today, days: 30, seed: 3 })
    const amounts = async (db: typeof a.db) =>
      (await db.payments.orderBy('date').toArray()).map((p) => `${p.date}:${p.amountMinor}`)
    expect(await amounts(a.db)).toEqual(await amounts(b.db))
  })

  it('gives the insights engine something to say', async () => {
    const { db, repos } = createTestDb()
    await seedDemoData(repos, { today, days: 90 })
    const { data } = await exportBackup(db)
    const insights = getInsights({
      today,
      settings: await repos.settings.get(),
      data,
    })
    expect(insights.length).toBeGreaterThanOrEqual(5)
    expect(new Set(insights.map((i) => i.domain)).size).toBeGreaterThanOrEqual(3)
  })
})
