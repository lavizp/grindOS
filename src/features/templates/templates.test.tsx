import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { db, repositories } from '@/db'
import { todayKey } from '@/lib/dates'

function renderAt(...paths: string[]) {
  const router = createMemoryRouter(routes, {
    initialEntries: paths,
    initialIndex: paths.length - 1,
  })
  render(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
  )
  return { router, user: userEvent.setup() }
}

const push = {
  name: 'Push',
  unit: 'kg' as const,
  entries: [
    {
      exerciseId: 'ex_bench_press',
      sets: [
        { reps: 8, weight: 60 },
        { reps: 8, weight: 60 },
      ],
    },
    { exerciseId: 'ex_dips', sets: [{ reps: 12 }] },
  ],
}

afterEach(async () => {
  await db.templates.clear()
  await db.workouts.clear()
  localStorage.clear()
})

describe('templates page', () => {
  it('is empty by default', async () => {
    renderAt('/settings/templates')
    expect(await screen.findByText('No templates yet')).toBeInTheDocument()
  })

  it('creates a template with exercises and sets', async () => {
    const { router, user } = renderAt('/settings/templates', '/settings/templates/new')
    const sheet = await screen.findByRole('dialog', { name: 'New template' })
    await user.type(await within(sheet).findByLabelText('Name'), 'Pull')
    // A template has no date, time or note.
    expect(within(sheet).queryByLabelText('Minutes')).not.toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Add exercise' }))
    await user.type(within(sheet).getByRole('searchbox', { name: 'Search exercises' }), 'deadl')
    await user.click(
      within(within(sheet).getByRole('list', { name: 'Exercises' })).getByRole('button', {
        name: /^Deadlift/,
      }),
    )
    const card = within(sheet).getByRole('region', { name: 'Deadlift' })
    await user.type(within(card).getByLabelText('Set 1 reps'), '5')
    await user.type(within(card).getByLabelText('Set 1 weight'), '100')
    await user.click(within(card).getByRole('button', { name: 'Add set' }))
    await user.click(within(sheet).getByRole('button', { name: 'Save template' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/settings/templates'))
    expect(await repositories.templates.list()).toMatchObject([
      {
        name: 'Pull',
        unit: 'kg',
        entries: [
          {
            exerciseId: 'ex_deadlift',
            sets: [
              { reps: 5, weight: 100 },
              { reps: 5, weight: 100 },
            ],
          },
        ],
      },
    ])
  })

  it('edits a template', async () => {
    const template = await repositories.templates.create(push)
    const { user } = renderAt('/settings/templates', `/settings/templates/${template.id}`)
    const sheet = await screen.findByRole('dialog', { name: 'Edit template' })
    await user.click(await within(sheet).findByRole('button', { name: 'Remove Dips' }))
    await user.click(within(sheet).getByRole('button', { name: 'Save changes' }))
    await waitFor(async () =>
      expect((await repositories.templates.getById(template.id))?.entries).toHaveLength(1),
    )
  })
})

describe('using templates when logging', () => {
  it('starts a workout from a template', async () => {
    await repositories.templates.create(push)
    const { user } = renderAt('/workouts', '/workouts/new')
    await user.click(await screen.findByRole('button', { name: /^Start Push/ }))

    expect(screen.getByLabelText('Workout')).toHaveValue('Push')
    const bench = screen.getByRole('region', { name: 'Bench Press' })
    expect(within(bench).getByLabelText('Set 2 weight')).toHaveValue('60')
    expect(screen.getByRole('region', { name: 'Dips' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save workout' }))
    await waitFor(async () =>
      expect(await db.workouts.toArray()).toMatchObject([
        { name: 'Push', date: todayKey(), entries: push.entries },
      ]),
    )
  })

  it('shows no templates when there are none', async () => {
    renderAt('/workouts', '/workouts/new')
    await screen.findByLabelText('Workout')
    expect(screen.queryByRole('group', { name: 'Templates' })).not.toBeInTheDocument()
  })

  it('saves a logged workout as a template, replacing one with the same name', async () => {
    await repositories.templates.create({ ...push, entries: [] })
    const workout = await repositories.workouts.create({ ...push, date: todayKey() })
    const { user } = renderAt('/workouts', `/workouts/${workout.id}`)
    await user.click(await screen.findByRole('button', { name: 'Save as template' }))

    await waitFor(async () =>
      expect(await repositories.templates.list()).toMatchObject([
        { name: 'Push', entries: push.entries },
      ]),
    )
  })
})
