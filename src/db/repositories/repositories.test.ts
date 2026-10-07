import { DuplicateRecordError, RecordNotFoundError } from '@/db/repositories'
import { OTHER_CATEGORY_ID } from '@/db/seed'
import { createTestDb } from '@/test/db'

let ctx: ReturnType<typeof createTestDb>

beforeEach(() => {
  ctx = createTestDb()
})

afterEach(async () => {
  await ctx.db.delete()
})

describe('seed', () => {
  it('populates default categories, exercises, and settings on first open', async () => {
    const categories = await ctx.repos.categories.list()
    expect(categories.map((c) => c.name)).toEqual([
      'Food',
      'Transport',
      'Shopping',
      'Entertainment',
      'Bills',
      'Subscriptions',
      'Health',
      'Education',
      'Other',
    ])
    expect(categories.at(-1)?.id).toBe(OTHER_CATEGORY_ID)

    const exercises = await ctx.repos.exercises.list()
    expect(exercises.length).toBeGreaterThan(15)
    expect(await ctx.repos.exercises.getByName('bench press')).toMatchObject({
      id: 'ex_bench_press',
    })

    expect((await ctx.repos.settings.get()).currency).toBe('NPR')
  })
})

describe('payments', () => {
  const input = { date: '2026-10-07', amountMinor: 25000, categoryId: 'cat_food', merchant: 'Momo' }

  it('creates with id and timestamps', async () => {
    const payment = await ctx.repos.payments.create(input)
    expect(payment).toMatchObject({
      ...input,
      id: 'id-1',
      createdAt: Date.UTC(2026, 0, 1),
      updatedAt: Date.UTC(2026, 0, 1),
    })
    expect(await ctx.repos.payments.getById('id-1')).toEqual(payment)
  })

  it('updates, bumping updatedAt but not createdAt', async () => {
    const created = await ctx.repos.payments.create(input)
    ctx.clock.advance(5000)
    const updated = await ctx.repos.payments.update(created.id, { amountMinor: 30000 })
    expect(updated.amountMinor).toBe(30000)
    expect(updated.merchant).toBe('Momo')
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.updatedAt).toBe(created.createdAt + 5000)
  })

  it('clears optional fields when patched with undefined', async () => {
    const created = await ctx.repos.payments.create({ ...input, notes: 'with friends' })
    const updated = await ctx.repos.payments.update(created.id, { notes: undefined })
    expect(updated.notes).toBeUndefined()
  })

  it('validates input', async () => {
    await expect(ctx.repos.payments.create({ ...input, amountMinor: -1 })).rejects.toThrow()
    await expect(ctx.repos.payments.update('missing', {})).rejects.toBeInstanceOf(
      RecordNotFoundError,
    )
  })

  it('rejects unknown categories', async () => {
    await expect(
      ctx.repos.payments.create({ ...input, categoryId: 'nope' }),
    ).rejects.toBeInstanceOf(RecordNotFoundError)
  })

  it('deletes', async () => {
    const created = await ctx.repos.payments.create(input)
    await ctx.repos.payments.remove(created.id)
    expect(await ctx.repos.payments.getById(created.id)).toBeUndefined()
  })

  it('lists by inclusive range, newest first', async () => {
    for (const date of ['2026-09-30', '2026-10-01', '2026-10-05', '2026-10-07', '2026-10-08']) {
      await ctx.repos.payments.create({ ...input, date })
      ctx.clock.advance()
    }
    const rows = await ctx.repos.payments.listByRange({ start: '2026-10-01', end: '2026-10-07' })
    expect(rows.map((r) => r.date)).toEqual(['2026-10-07', '2026-10-05', '2026-10-01'])
  })

  it('orders same-day payments by creation time, newest first', async () => {
    const first = await ctx.repos.payments.create(input)
    ctx.clock.advance()
    const second = await ctx.repos.payments.create(input)
    const rows = await ctx.repos.payments.listByRange({ start: input.date, end: input.date })
    expect(rows.map((r) => r.id)).toEqual([second.id, first.id])
  })

  it('lists by category, optionally within a range', async () => {
    await ctx.repos.payments.create({ ...input, date: '2026-09-15' })
    await ctx.repos.payments.create({ ...input, date: '2026-10-02' })
    await ctx.repos.payments.create({ ...input, categoryId: 'cat_transport' })

    expect(await ctx.repos.payments.listByCategory('cat_food')).toHaveLength(2)
    const inOctober = await ctx.repos.payments.listByCategory('cat_food', {
      start: '2026-10-01',
      end: '2026-10-31',
    })
    expect(inOctober.map((p) => p.date)).toEqual(['2026-10-02'])
  })

  it('returns distinct recent merchants', async () => {
    for (const merchant of ['Momo', 'Pathao', 'momo', 'Daraz', undefined]) {
      await ctx.repos.payments.create({ ...input, merchant })
      ctx.clock.advance()
    }
    expect(await ctx.repos.payments.recentMerchants()).toEqual(['Daraz', 'momo', 'Pathao'])
    expect(await ctx.repos.payments.recentMerchants(1)).toEqual(['Daraz'])
  })
})

describe('sleep', () => {
  const input = {
    date: '2026-10-07',
    bedtime: '2026-10-06T23:30',
    wakeTime: '2026-10-07T07:00',
    quality: 4,
  }

  it('enforces one entry per night', async () => {
    await ctx.repos.sleep.create(input)
    await expect(ctx.repos.sleep.create(input)).rejects.toBeInstanceOf(DuplicateRecordError)
  })

  it('finds by date and latest', async () => {
    await ctx.repos.sleep.create(input)
    await ctx.repos.sleep.create({
      date: '2026-10-08',
      bedtime: '2026-10-08T00:30',
      wakeTime: '2026-10-08T08:00',
    })
    expect((await ctx.repos.sleep.getByDate('2026-10-07'))?.quality).toBe(4)
    expect((await ctx.repos.sleep.getLatest())?.date).toBe('2026-10-08')
    expect(await ctx.repos.sleep.getByDate('2026-10-09')).toBeUndefined()
  })

  it('rejects invalid sleep windows on update', async () => {
    const created = await ctx.repos.sleep.create(input)
    await expect(
      ctx.repos.sleep.update(created.id, { wakeTime: '2026-10-06T22:00' }),
    ).rejects.toThrow()
  })
})

describe('workouts', () => {
  const push = {
    date: '2026-10-05',
    name: 'Push',
    unit: 'kg' as const,
    startTime: '18:00',
    entries: [
      {
        exerciseId: 'ex_bench_press',
        sets: [
          { reps: 8, weight: 60 },
          { reps: 8, weight: 60 },
        ],
      },
      { exerciseId: 'ex_dips', sets: [{ reps: 12 }] },
      { exerciseId: 'ex_bench_press', sets: [{ reps: 5, weight: 70 }] },
    ],
  }

  it('derives distinct exerciseIds from entries', async () => {
    const workout = await ctx.repos.workouts.create(push)
    expect(workout.exerciseIds).toEqual(['ex_bench_press', 'ex_dips'])
  })

  it('re-derives exerciseIds on update', async () => {
    const workout = await ctx.repos.workouts.create(push)
    const updated = await ctx.repos.workouts.update(workout.id, {
      entries: [{ exerciseId: 'ex_squat', sets: [{ reps: 5, weight: 100 }] }],
    })
    expect(updated.exerciseIds).toEqual(['ex_squat'])
    expect(await ctx.repos.workouts.listByExercise('ex_bench_press')).toEqual([])
  })

  it('queries by exercise via the multiEntry index', async () => {
    await ctx.repos.workouts.create(push)
    await ctx.repos.workouts.create({ ...push, date: '2026-10-07' })
    await ctx.repos.workouts.create({ ...push, name: 'Legs', entries: [] })
    const rows = await ctx.repos.workouts.listByExercise('ex_dips')
    expect(rows.map((w) => w.date)).toEqual(['2026-10-07', '2026-10-05'])
  })

  it('finds the latest workout by name and recent names', async () => {
    await ctx.repos.workouts.create(push)
    await ctx.repos.workouts.create({ ...push, name: 'Legs', date: '2026-10-06', entries: [] })
    const latest = await ctx.repos.workouts.create({ ...push, date: '2026-10-08' })

    expect((await ctx.repos.workouts.getLatestByName('Push'))?.id).toBe(latest.id)
    expect(await ctx.repos.workouts.recentNames()).toEqual(['Push', 'Legs'])
  })

  it('lists by range', async () => {
    await ctx.repos.workouts.create(push)
    await ctx.repos.workouts.create({ ...push, date: '2026-10-12' })
    const rows = await ctx.repos.workouts.listByRange({ start: '2026-10-04', end: '2026-10-10' })
    expect(rows).toHaveLength(1)
  })
})

describe('exercises', () => {
  it('enforces case-insensitive unique names', async () => {
    await expect(
      ctx.repos.exercises.create({ name: 'BENCH PRESS', kind: 'weighted' }),
    ).rejects.toBeInstanceOf(DuplicateRecordError)
  })

  it('finds or creates by name', async () => {
    const existing = await ctx.repos.exercises.findOrCreate('  squat ')
    expect(existing.id).toBe('ex_squat')

    const created = await ctx.repos.exercises.findOrCreate('Cable Fly')
    expect(created).toMatchObject({ name: 'Cable Fly', nameKey: 'cable fly', kind: 'weighted' })
    expect((await ctx.repos.exercises.findOrCreate('cable fly')).id).toBe(created.id)
  })

  it('hides archived exercises by default', async () => {
    await ctx.repos.exercises.update('ex_squat', { archived: true })
    const names = (await ctx.repos.exercises.list()).map((e) => e.name)
    expect(names).not.toContain('Squat')
    const all = (await ctx.repos.exercises.list({ includeArchived: true })).map((e) => e.name)
    expect(all).toContain('Squat')
  })

  it('updates nameKey on rename', async () => {
    const renamed = await ctx.repos.exercises.update('ex_squat', { name: 'Back Squat' })
    expect(renamed.nameKey).toBe('back squat')
    expect((await ctx.repos.exercises.getByName('BACK SQUAT'))?.id).toBe('ex_squat')
  })
})

describe('categories', () => {
  it('appends new categories at the end', async () => {
    const created = await ctx.repos.categories.create({
      name: 'Gifts',
      icon: 'gift',
      color: '#f43f5e',
    })
    expect(created.order).toBe(9)
    expect((await ctx.repos.categories.list()).at(-1)?.name).toBe('Gifts')
  })

  it('archives instead of deleting', async () => {
    await ctx.repos.categories.archive('cat_education')
    expect((await ctx.repos.categories.list()).map((c) => c.id)).not.toContain('cat_education')
    expect(await ctx.repos.categories.getById('cat_education')).toMatchObject({ archived: true })
  })

  it('reorders', async () => {
    await ctx.repos.categories.reorder(['cat_other', 'cat_food'])
    const [first, second] = await ctx.repos.categories.list()
    expect([first?.id, second?.id]).toEqual(['cat_other', 'cat_food'])
  })
})

describe('settings', () => {
  it('returns defaults when no row exists', async () => {
    await ctx.db.settings.clear()
    expect(await ctx.repos.settings.get()).toMatchObject({ currency: 'NPR', weekStartsOn: 0 })
  })

  it('merges and validates updates', async () => {
    const updated = await ctx.repos.settings.update({ weightUnit: 'lb', weekStartsOn: 1 })
    expect(updated).toMatchObject({ weightUnit: 'lb', weekStartsOn: 1, currency: 'NPR' })
    await expect(ctx.repos.settings.update({ currency: 'nope' })).rejects.toThrow()
    expect((await ctx.repos.settings.get()).weightUnit).toBe('lb')
  })
})
