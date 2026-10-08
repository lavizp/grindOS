import {
  backupFileName,
  deleteAllData,
  exportBackup,
  importBackup,
  parseBackup,
  summarizeBackup,
  type Backup,
} from '@/db/backup'
import { createTestDb } from '@/test/db'

/** A database with a bit of everything in it. */
async function populated() {
  const ctx = createTestDb()
  const { repos } = ctx
  await repos.settings.update({ currency: 'USD', weightUnit: 'lb', lastBackupAt: 1000 })
  const category = await repos.categories.create({
    name: 'Coffee',
    icon: 'coffee',
    color: '#7c2d12',
  })
  const exercise = await repos.exercises.create({ name: 'Zercher Squat', kind: 'weighted' })
  await repos.workouts.create({
    date: '2026-10-05',
    name: 'Legs',
    unit: 'lb',
    entries: [{ exerciseId: exercise.id, sets: [{ reps: 5, weight: 185 }] }],
  })
  await repos.sleep.create({
    date: '2026-10-06',
    bedtime: '2026-10-05T23:15',
    wakeTime: '2026-10-06T07:00',
    quality: 4,
  })
  await repos.payments.create({ date: '2026-10-06', amountMinor: 450, categoryId: category.id })
  return ctx
}

const sorted = <T extends { id: string }>(rows: T[]) =>
  [...rows].sort((a, b) => a.id.localeCompare(b.id))
const normalize = (backup: Backup) =>
  Object.fromEntries(
    Object.entries(backup.data).map(([table, rows]) => [table, sorted(rows as { id: string }[])]),
  )

describe('export and import', () => {
  it('round-trips through JSON into an empty database unchanged', async () => {
    const source = await populated()
    const backup = await exportBackup(source.db, 5000)
    expect(backup).toMatchObject({ app: 'grindOS', schemaVersion: 1, exportedAt: 5000 })

    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed.ok).toBe(true)
    const target = createTestDb()
    await importBackup(target.db, (parsed as { backup: Backup }).backup, 'replace')

    expect(normalize(await exportBackup(target.db, 5000))).toEqual(normalize(backup))
  })

  it('summarizes what a backup holds', async () => {
    const { db } = await populated()
    const summary = summarizeBackup(await exportBackup(db))
    expect(summary).toMatchObject({ workouts: 1, sleep: 1, payments: 1, settings: 1 })
    expect(summary.categories).toBeGreaterThan(9) // the defaults plus Coffee
  })

  it('names the file by date', () => {
    expect(backupFileName(new Date(2026, 9, 8, 23, 59).getTime())).toBe(
      'grindos-backup-2026-10-08.json',
    )
  })
})

describe('parseBackup', () => {
  async function validJson() {
    const { db } = await populated()
    return JSON.parse(JSON.stringify(await exportBackup(db)))
  }

  it('rejects files that aren’t backups', () => {
    expect(parseBackup('not json')).toEqual({
      ok: false,
      error: 'This file isn’t a grindOS backup. It isn’t valid JSON.',
    })
    expect(parseBackup('{"app":"other","schemaVersion":1}')).toMatchObject({ ok: false })
    expect(parseBackup('[]')).toMatchObject({ ok: false })
  })

  it('rejects backups from a newer version', async () => {
    const json = await validJson()
    json.schemaVersion = 2
    expect(parseBackup(JSON.stringify(json))).toMatchObject({
      ok: false,
      error: expect.stringContaining('newer version'),
    })
  })

  it('rejects damaged records, saying where', async () => {
    const json = await validJson()
    json.data.payments[0].amountMinor = -5
    const result = parseBackup(JSON.stringify(json))
    expect(result).toMatchObject({ ok: false })
    expect((result as { error: string }).error).toContain('data → payments → 0')
  })

  it('rejects a sleep entry whose times don’t add up', async () => {
    const json = await validJson()
    json.data.sleep[0].wakeTime = '2026-10-05T22:00'
    expect(parseBackup(JSON.stringify(json)).ok).toBe(false)
  })
})

describe('merge', () => {
  it('keeps whichever copy of a record was updated last', async () => {
    const local = await populated()
    const backup = await exportBackup(local.db)
    const [payment] = backup.data.payments
    const [night] = backup.data.sleep

    // Locally, the payment is edited after the backup; the night is edited in the backup.
    local.clock.advance(60_000)
    await local.repos.payments.update(payment.id, { amountMinor: 999 })
    const newerNight = { ...night, quality: 1 as const, updatedAt: night.updatedAt + 120_000 }
    const olderPayment = { ...payment, amountMinor: 1 }
    const result = await importBackup(
      local.db,
      { ...backup, data: { ...backup.data, payments: [olderPayment], sleep: [newerNight] } },
      'merge',
    )

    expect((await local.repos.payments.getById(payment.id))?.amountMinor).toBe(999)
    expect((await local.repos.sleep.getById(night.id))?.quality).toBe(1)
    expect(result.written).toBeGreaterThan(0)
    expect(result.skipped).toBeGreaterThan(0)
  })

  it('adds records it doesn’t have and leaves local ones alone', async () => {
    const other = await populated()
    const local = createTestDb()
    const mine = await local.repos.payments.create({
      date: '2026-10-07',
      amountMinor: 100,
      categoryId: 'cat_food',
    })
    await importBackup(local.db, await exportBackup(other.db), 'merge')

    expect(await local.db.payments.count()).toBe(2)
    expect(await local.repos.payments.getById(mine.id)).toBeDefined()
    expect(await local.db.workouts.count()).toBe(1)
  })

  it('keeps one entry per night when both sides logged it', async () => {
    const local = createTestDb()
    await local.repos.sleep.create({
      date: '2026-10-06',
      bedtime: '2026-10-05T22:00',
      wakeTime: '2026-10-06T06:00',
    })
    // The other device logged the same night under its own id, and edited it later.
    const backup = await exportBackup((await populated()).db)
    const [theirs] = backup.data.sleep
    const newer = { ...theirs, updatedAt: theirs.updatedAt + 60_000 }
    await importBackup(local.db, { ...backup, data: { ...backup.data, sleep: [newer] } }, 'merge')

    const nights = await local.db.sleep.where('date').equals('2026-10-06').toArray()
    expect(nights).toHaveLength(1)
    expect(nights[0].bedtime).toBe('2026-10-05T23:15')
  })

  it('folds an exercise with the same name into the local one', async () => {
    const local = createTestDb()
    const mine = await local.repos.exercises.create({ name: 'Zercher Squat', kind: 'weighted' })
    const other = await populated()
    await importBackup(local.db, await exportBackup(other.db), 'merge')

    expect(await local.db.exercises.where('nameKey').equals('zercher squat').count()).toBe(1)
    const [workout] = await local.db.workouts.toArray()
    expect(workout.entries[0].exerciseId).toBe(mine.id)
    expect(workout.exerciseIds).toEqual([mine.id])
  })

  it('keeps this device’s settings, except a newer backup date', async () => {
    const local = createTestDb()
    await importBackup(local.db, await exportBackup((await populated()).db), 'merge')
    expect(await local.repos.settings.get()).toMatchObject({
      currency: 'NPR',
      weightUnit: 'kg',
      lastBackupAt: 1000,
    })
  })
})

describe('replace', () => {
  it('swaps everything for the backup, settings included', async () => {
    const local = createTestDb()
    await local.repos.payments.create({
      date: '2026-10-07',
      amountMinor: 100,
      categoryId: 'cat_food',
    })
    await importBackup(local.db, await exportBackup((await populated()).db), 'replace')
    expect(await local.db.payments.count()).toBe(1)
    expect(await local.repos.settings.get()).toMatchObject({ currency: 'USD', weightUnit: 'lb' })
  })

  it('changes nothing when the import fails partway', async () => {
    const local = await populated()
    const before = await exportBackup(local.db, 0)
    const backup = await exportBackup(local.db, 0)
    // Two nights on one date break the unique index during the import.
    const broken = {
      ...backup,
      data: {
        ...backup.data,
        sleep: [...backup.data.sleep, { ...backup.data.sleep[0], id: 'duplicate-night' }],
      },
    }
    await expect(importBackup(local.db, broken, 'replace')).rejects.toThrow()
    expect(normalize(await exportBackup(local.db, 0))).toEqual(normalize(before))
  })
})

describe('deleteAllData', () => {
  it('returns to a fresh install', async () => {
    const { db, repos } = await populated()
    await deleteAllData(db)
    expect(await db.workouts.count()).toBe(0)
    expect(await db.payments.count()).toBe(0)
    expect(await repos.categories.getById('cat_food')).toBeDefined()
    expect(await repos.exercises.getByName('Zercher Squat')).toBeUndefined()
    expect(await repos.exercises.getByName('Bench Press')).toBeDefined()
    const settings = await repos.settings.get()
    expect(settings.currency).toBe('NPR')
    expect(settings.lastBackupAt).toBeUndefined()
  })
})
