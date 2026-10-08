import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { db, repositories } from '@/db'
import { addDaysToKey, todayKey } from '@/lib/dates'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, {
    initialEntries: ['/workouts', path],
    initialIndex: 1,
  })
  render(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
  )
  return { router, user: userEvent.setup() }
}

const today = todayKey()

async function pickExercise(user: ReturnType<typeof userEvent.setup>, query: string, name: string) {
  await user.click(screen.getByRole('button', { name: 'Add exercise' }))
  await user.type(screen.getByRole('searchbox', { name: 'Search exercises' }), query)
  await user.click(
    // The button also carries a tag such as "Bodyweight".
    within(screen.getByRole('list', { name: 'Exercises' })).getByRole('button', {
      name: new RegExp(`^${name}`),
    }),
  )
}

afterEach(async () => {
  await db.workouts.clear()
  localStorage.clear()
})

describe('workout sheet', () => {
  it('needs a name', async () => {
    const { user } = renderAt('/workouts/new')
    await screen.findByLabelText('Workout')
    await user.click(screen.getByRole('button', { name: 'Save workout' }))
    expect(await screen.findByText('Name the workout')).toBeInTheDocument()
    expect(await db.workouts.count()).toBe(0)
  })

  it('logs a workout with no exercises from a name chip, and can undo', async () => {
    const { router, user } = renderAt('/workouts/new')
    await user.click(await screen.findByRole('button', { name: 'Run' }))
    await user.type(screen.getByLabelText('Minutes'), '35')
    await user.click(screen.getByRole('button', { name: 'Save workout' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/workouts'))
    expect(await db.workouts.toArray()).toMatchObject([
      { name: 'Run', date: today, durationMin: 35, unit: 'kg', entries: [] },
    ])
    // The closing sheet blocks pointer events until it has gone.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect(await db.workouts.count()).toBe(0))
  })

  describe('set editor', () => {
    it('adds sets that copy the one above, and removes them', async () => {
      const { user } = renderAt('/workouts/new')
      await user.type(await screen.findByLabelText('Workout'), 'Push')
      await pickExercise(user, 'bench', 'Bench Press')

      const card = screen.getByRole('region', { name: 'Bench Press' })
      await user.type(within(card).getByLabelText('Set 1 reps'), '8')
      await user.type(within(card).getByLabelText('Set 1 weight'), '60')
      await user.click(within(card).getByRole('button', { name: 'Add set' }))
      await user.click(within(card).getByRole('button', { name: 'Add set' }))

      expect(within(card).getByLabelText('Set 3 reps')).toHaveValue('8')
      expect(within(card).getByLabelText('Set 3 weight')).toHaveValue('60')

      await user.clear(within(card).getByLabelText('Set 2 weight'))
      await user.type(within(card).getByLabelText('Set 2 weight'), '62.5')
      await user.click(within(card).getByRole('button', { name: 'Remove set 3 of Bench Press' }))
      expect(within(card).queryByLabelText('Set 3 reps')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Save workout' }))
      await waitFor(async () => expect(await db.workouts.count()).toBe(1))
      const [saved] = await db.workouts.toArray()
      expect(saved.entries).toEqual([
        {
          exerciseId: 'ex_bench_press',
          sets: [
            { reps: 8, weight: 60 },
            { reps: 8, weight: 62.5 },
          ],
        },
      ])
    })

    it('hides the weight for bodyweight exercises', async () => {
      const { user } = renderAt('/workouts/new')
      await user.type(await screen.findByLabelText('Workout'), 'Push')
      await pickExercise(user, 'dip', 'Dips')
      const card = screen.getByRole('region', { name: 'Dips' })
      expect(within(card).getByLabelText('Set 1 reps')).toBeInTheDocument()
      expect(within(card).queryByLabelText('Set 1 weight')).not.toBeInTheDocument()
    })

    it('flags a set with no reps', async () => {
      const { user } = renderAt('/workouts/new')
      await user.type(await screen.findByLabelText('Workout'), 'Push')
      await pickExercise(user, 'bench', 'Bench Press')
      await user.click(screen.getByRole('button', { name: 'Save workout' }))
      expect(await screen.findByText('Enter reps')).toBeInTheDocument()
      expect(screen.getByLabelText('Set 1 reps')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('creates a new exercise from the search', async () => {
    const { user } = renderAt('/workouts/new')
    await user.type(await screen.findByLabelText('Workout'), 'Pull')
    await user.click(screen.getByRole('button', { name: 'Add exercise' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search exercises' }), 'Muscle-up')
    await user.click(screen.getByRole('button', { name: 'Bodyweight' }))

    const card = await screen.findByRole('region', { name: 'Muscle-up' })
    expect(within(card).queryByLabelText('Set 1 weight')).not.toBeInTheDocument()
    expect(await repositories.exercises.getByName('muscle-up')).toMatchObject({
      kind: 'bodyweight',
    })
  })

  it('reorders and removes exercises', async () => {
    // Start from three exercises in one tap; adding them is covered above.
    await repositories.workouts.create({
      date: addDaysToKey(today, -2),
      name: 'Push',
      unit: 'kg',
      entries: ['ex_bench_press', 'ex_dips', 'ex_overhead_press'].map((exerciseId) => ({
        exerciseId,
        sets: [{ reps: 8 }],
      })),
    })
    const { user } = renderAt('/workouts/new')
    await user.click(await screen.findByRole('button', { name: 'Push' }))
    await user.click(screen.getByRole('button', { name: /Repeat last Push/ }))

    await user.click(screen.getByRole('button', { name: 'Move Dips up' }))
    await user.click(screen.getByRole('button', { name: 'Remove Overhead Press' }))
    const sheet = screen.getByRole('dialog', { name: 'Log workout' })
    expect(
      within(sheet)
        .getAllByRole('region')
        .map((r) => r.getAttribute('aria-label')),
    ).toEqual(['Dips', 'Bench Press'])
  })

  it('repeats the last workout of the same name, with last-time hints', async () => {
    await repositories.workouts.create({
      date: addDaysToKey(today, -3),
      name: 'Push',
      unit: 'kg',
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
    })
    const { user } = renderAt('/workouts/new')
    await user.click(await screen.findByRole('button', { name: 'Push' }))
    await user.click(screen.getByRole('button', { name: /Repeat last Push/ }))

    const bench = screen.getByRole('region', { name: 'Bench Press' })
    expect(within(bench).getByText(/Last time .*: 2×8 @ 60 kg/)).toBeInTheDocument()
    expect(within(bench).getByLabelText('Set 2 weight')).toHaveValue('60')
    expect(screen.getByRole('region', { name: 'Dips' })).toBeInTheDocument()
  })

  it('celebrates a new record', async () => {
    await repositories.workouts.create({
      date: addDaysToKey(today, -3),
      name: 'Push',
      unit: 'kg',
      entries: [{ exerciseId: 'ex_bench_press', sets: [{ reps: 5, weight: 80 }] }],
    })
    const { user } = renderAt('/workouts/new')
    await user.click(await screen.findByRole('button', { name: 'Push' }))
    await user.click(screen.getByRole('button', { name: /Repeat last Push/ }))
    const weight = screen.getByLabelText('Set 1 weight')
    await user.clear(weight)
    await user.type(weight, '85')
    await user.click(screen.getByRole('button', { name: 'Save workout' }))
    expect(await screen.findByText('New record: Bench Press')).toBeInTheDocument()
  })

  it('keeps an unsaved workout as a draft until it is discarded', async () => {
    const first = renderAt('/workouts/new')
    await first.user.type(await screen.findByLabelText('Workout'), 'Legs')
    await first.user.keyboard('{Escape}')
    await waitFor(() => expect(first.router.state.location.pathname).toBe('/workouts'))

    await first.router.navigate('/workouts/new')
    expect(await screen.findByText('Picked up your unsaved workout.')).toBeInTheDocument()
    expect(screen.getByLabelText('Workout')).toHaveValue('Legs')

    await first.user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByLabelText('Workout')).toHaveValue('')
    expect(localStorage.getItem('grindos-workout-draft')).toBeNull()
  })

  it('edits and deletes a workout', async () => {
    const workout = await repositories.workouts.create({
      date: today,
      name: 'Legs',
      unit: 'kg',
      entries: [{ exerciseId: 'ex_squat', sets: [{ reps: 5, weight: 100 }] }],
    })
    const { router, user } = renderAt(`/workouts/${workout.id}`)
    const reps = await screen.findByLabelText('Set 1 reps')
    await user.clear(reps)
    await user.type(reps, '6')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/workouts'))
    expect((await repositories.workouts.getById(workout.id))?.entries[0].sets).toEqual([
      { reps: 6, weight: 100 },
    ])
    // Edits never leave a draft behind.
    expect(localStorage.getItem('grindos-workout-draft')).toBeNull()

    await router.navigate(`/workouts/${workout.id}`)
    await user.click(await screen.findByRole('button', { name: 'Delete workout' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this workout?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect(await db.workouts.count()).toBe(0))
  })
})
