import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { db, repositories } from '@/db'
import { deleteAllData } from '@/db/backup'

function renderAt(path: string) {
  render(
    <>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
      <Toaster />
    </>,
  )
  return userEvent.setup()
}

afterEach(async () => {
  await deleteAllData(db)
})

describe('category manager', () => {
  it('adds a category with an icon and color', async () => {
    const user = renderAt('/settings/categories')
    await user.click(await screen.findByRole('button', { name: 'Add category' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add category' })
    await user.type(within(sheet).getByLabelText('Name'), 'Coffee')
    await user.click(within(sheet).getByRole('radio', { name: 'coffee' }))
    await user.click(within(sheet).getByRole('radio', { name: '#a16207' }))
    await user.click(within(sheet).getByRole('button', { name: 'Add category' }))

    await waitFor(async () =>
      expect((await repositories.categories.list()).at(-1)).toMatchObject({
        name: 'Coffee',
        icon: 'coffee',
        color: '#a16207',
      }),
    )
  })

  it('requires a name', async () => {
    const user = renderAt('/settings/categories')
    await user.click(await screen.findByRole('button', { name: 'Add category' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add category' })
    await user.click(within(sheet).getByRole('button', { name: 'Add category' }))
    expect(within(sheet).getByText('Name the category')).toBeInTheDocument()
  })

  it('renames a category', async () => {
    const user = renderAt('/settings/categories')
    await user.click(await screen.findByRole('button', { name: 'Food' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit category' })
    const name = within(sheet).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Groceries')
    await user.click(within(sheet).getByRole('button', { name: 'Save changes' }))
    await waitFor(async () =>
      expect((await repositories.categories.getById('cat_food'))?.name).toBe('Groceries'),
    )
  })

  it('reorders categories', async () => {
    const user = renderAt('/settings/categories')
    await user.click(await screen.findByRole('button', { name: 'Move Transport up' }))
    await waitFor(async () =>
      expect((await repositories.categories.list()).slice(0, 2).map((c) => c.id)).toEqual([
        'cat_transport',
        'cat_food',
      ]),
    )
  })

  it('archives and restores a category', async () => {
    const user = renderAt('/settings/categories')
    await user.click(await screen.findByRole('button', { name: 'Food' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit category' })
    await user.click(within(sheet).getByRole('button', { name: 'Archive' }))

    const restore = await screen.findByRole('button', { name: 'Restore Food' })
    expect((await repositories.categories.getById('cat_food'))?.archived).toBe(true)
    await user.click(restore)
    await waitFor(async () =>
      expect((await repositories.categories.getById('cat_food'))?.archived).toBe(false),
    )
  })
})

describe('exercise manager', () => {
  it('searches and renames, refusing a name that’s taken', async () => {
    const user = renderAt('/settings/exercises')
    await user.type(await screen.findByRole('searchbox', { name: 'Search exercises' }), 'bench')
    expect(screen.queryByRole('button', { name: /Squat/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Bench Press/ }))

    const sheet = await screen.findByRole('dialog', { name: 'Edit exercise' })
    const name = within(sheet).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Squat')
    await user.click(within(sheet).getByRole('button', { name: 'Save changes' }))
    expect(
      await within(sheet).findByText(
        'There’s already an exercise called Squat. Merge into it instead.',
      ),
    ).toBeInTheDocument()

    await user.clear(name)
    await user.type(name, 'Flat Bench Press')
    await user.click(within(sheet).getByRole('button', { name: 'Save changes' }))
    await waitFor(async () =>
      expect((await repositories.exercises.getById('ex_bench_press'))?.name).toBe(
        'Flat Bench Press',
      ),
    )
  })

  it('merges a duplicate into another exercise', async () => {
    const dupe = await repositories.exercises.create({ name: 'Bench', kind: 'weighted' })
    await repositories.workouts.create({
      date: '2026-10-05',
      name: 'Push',
      unit: 'kg',
      entries: [{ exerciseId: dupe.id, sets: [{ reps: 5, weight: 60 }] }],
    })
    const user = renderAt('/settings/exercises')
    await user.click(
      await screen.findByRole('button', { name: /^Bench\s*With weights, 1 workout/ }),
    )
    const sheet = await screen.findByRole('dialog', { name: 'Edit exercise' })
    await user.selectOptions(
      within(sheet).getByLabelText('Merge into another exercise'),
      'ex_bench_press',
    )
    await user.click(within(sheet).getByRole('button', { name: 'Merge' }))
    const confirm = await screen.findByRole('alertdialog', {
      name: 'Merge Bench into Bench Press?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Merge' }))

    expect(await screen.findByText('Merged into Bench Press')).toBeInTheDocument()
    expect(await repositories.exercises.getById(dupe.id)).toBeUndefined()
    expect((await db.workouts.toArray())[0].exerciseIds).toEqual(['ex_bench_press'])
  })

  it('archives and restores', async () => {
    const user = renderAt('/settings/exercises')
    await user.click(await screen.findByRole('button', { name: /^Dips/ }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Edit exercise' })).getByRole('button', {
        name: 'Archive',
      }),
    )
    await waitFor(async () =>
      expect((await repositories.exercises.getById('ex_dips'))?.archived).toBe(true),
    )
    expect(await screen.findByRole('heading', { name: 'Archived' })).toBeInTheDocument()
  })
})
