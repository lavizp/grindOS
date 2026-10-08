import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { db, repositories } from '@/db'
import { deleteAllData, exportBackup, parseBackup } from '@/db/backup'
import { saveFile } from '@/lib/save-file'

vi.mock('@/lib/save-file', () => ({ saveFile: vi.fn(async () => 'downloaded') }))

function renderSettings() {
  render(
    <>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/settings'] })} />
      <Toaster />
    </>,
  )
  return userEvent.setup()
}

afterEach(async () => {
  await deleteAllData(db)
  vi.mocked(saveFile).mockClear()
})

describe('preferences', () => {
  it('saves each preference as it changes', async () => {
    const user = renderSettings()
    await user.selectOptions(await screen.findByLabelText('Currency'), 'USD')
    await user.click(screen.getByRole('radio', { name: 'lb' }))
    await user.click(screen.getByRole('radio', { name: 'Monday' }))
    await user.selectOptions(screen.getByLabelText('Sleep target'), '450')
    await user.click(screen.getByRole('radio', { name: 'Dark' }))

    await waitFor(async () =>
      expect(await repositories.settings.get()).toMatchObject({
        currency: 'USD',
        weightUnit: 'lb',
        weekStartsOn: 1,
        sleepTargetMin: 450,
        theme: 'dark',
      }),
    )
  })

  it('links to the category and exercise managers', async () => {
    renderSettings()
    const manage = await screen.findByRole('navigation', { name: 'Manage' })
    expect(within(manage).getByRole('link', { name: /Payment categories/ })).toHaveAttribute(
      'href',
      '/settings/categories',
    )
    expect(within(manage).getByRole('link', { name: /Exercises/ })).toHaveAttribute(
      'href',
      '/settings/exercises',
    )
  })
})

describe('backup', () => {
  it('exports everything to a file and records the backup', async () => {
    await repositories.payments.create({
      date: '2026-10-07',
      amountMinor: 500,
      categoryId: 'cat_food',
    })
    const user = renderSettings()
    expect(await screen.findByText('You haven’t backed up yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Export backup' }))

    await waitFor(() => expect(saveFile).toHaveBeenCalledOnce())
    const file = vi.mocked(saveFile).mock.calls[0][0]
    expect(file.name).toMatch(/^grindos-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const parsed = parseBackup(await file.text())
    expect(parsed.ok && parsed.backup.data.payments).toHaveLength(1)

    expect(await screen.findByText('Backup saved')).toBeInTheDocument()
    expect(await screen.findByText(/Last backup: today/)).toBeInTheDocument()
    expect((await repositories.settings.get()).lastBackupAt).toBeDefined()
  })

  it('doesn’t count a cancelled share as a backup', async () => {
    vi.mocked(saveFile).mockResolvedValueOnce('cancelled')
    const user = renderSettings()
    await user.click(await screen.findByRole('button', { name: 'Export backup' }))
    await waitFor(() => expect(saveFile).toHaveBeenCalledOnce())
    expect((await repositories.settings.get()).lastBackupAt).toBeUndefined()
  })

  it('previews a backup, then merges it', async () => {
    await repositories.payments.create({
      date: '2026-10-07',
      amountMinor: 500,
      categoryId: 'cat_food',
    })
    const backup = await exportBackup(db)
    await deleteAllData(db)
    await repositories.payments.create({
      date: '2026-10-08',
      amountMinor: 900,
      categoryId: 'cat_food',
    })

    const user = renderSettings()
    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })
    await user.upload(await screen.findByLabelText('Backup file'), file)

    const dialog = await screen.findByRole('alertdialog', { name: 'Import this backup?' })
    expect(within(dialog).getByText('Payments').nextSibling).toHaveTextContent('1')
    await user.click(within(dialog).getByRole('button', { name: 'Merge' }))

    expect(await screen.findByText('Backup merged')).toBeInTheDocument()
    expect(await db.payments.count()).toBe(2)
  })

  it('replaces everything when asked', async () => {
    const backup = await exportBackup(db)
    await repositories.payments.create({
      date: '2026-10-08',
      amountMinor: 900,
      categoryId: 'cat_food',
    })
    const user = renderSettings()
    await user.upload(
      await screen.findByLabelText('Backup file'),
      new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Replace all' }))
    expect(await screen.findByText('Backup restored')).toBeInTheDocument()
    expect(await db.payments.count()).toBe(0)
  })

  it('explains why a file can’t be imported', async () => {
    const user = renderSettings()
    await user.upload(
      await screen.findByLabelText('Backup file'),
      new File(['{"hello":"world"}'], 'notes.json', { type: 'application/json' }),
    )
    expect(await screen.findByText('This file isn’t a grindOS backup.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('delete all data', () => {
  it('needs the word typed before it deletes', async () => {
    await repositories.payments.create({
      date: '2026-10-07',
      amountMinor: 500,
      categoryId: 'cat_food',
    })
    const user = renderSettings()
    await user.click(await screen.findByRole('button', { name: 'Delete all data' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete everything?' })
    const confirm = within(dialog).getByRole('button', { name: 'Delete everything' })
    expect(confirm).toBeDisabled()

    await user.type(within(dialog).getByLabelText('Type delete to confirm'), 'delete')
    await user.click(confirm)
    expect(await screen.findByText('All data deleted')).toBeInTheDocument()
    expect(await db.payments.count()).toBe(0)
    expect(await repositories.categories.getById('cat_food')).toBeDefined()
  })
})
