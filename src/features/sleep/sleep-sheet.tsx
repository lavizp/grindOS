import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { FormSheet } from '@/components/common/form-sheet'
import { Button } from '@/components/ui/button'
import { repositories } from '@/db'
import type { Sleep, SleepInput } from '@/db/schema'
import { useSleepTarget } from '@/hooks/use-data'
import { useCloseRoute } from '@/hooks/use-close-route'
import { SLEEP_FORM_ID, SleepForm } from '@/features/sleep/sleep-form'
import { emptySleepForm, sleepToForm, sleepToInput } from '@/features/sleep/sleep-form-schema'
import { todayKey } from '@/lib/dates'

/** /sleep/new and /sleep/:id, shown as a sheet over the Sleep page. */
export function SleepSheet() {
  const { id } = useParams()
  const close = useCloseRoute('/sleep')
  const targetMin = useSleepTarget()
  const loggedNights = useLiveQuery(() => repositories.sleep.loggedNights(), [])
  const latest = useLiveQuery(async () => (await repositories.sleep.getLatest()) ?? null, [])
  // null = not found, undefined = still loading.
  const entry = useLiveQuery(
    async () => (id ? ((await repositories.sleep.getById(id)) ?? null) : null),
    [id],
  )
  const [submitted, setSubmitted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isEdit = id !== undefined
  const loading = loggedNights === undefined || latest === undefined || entry === undefined

  // One entry per night: logging a night that's already there opens it instead.
  const today = todayKey()
  const existingToday = !isEdit && !submitted ? loggedNights?.get(today) : undefined
  if (existingToday) return <Navigate to={`/sleep/${existingToday}`} replace />

  async function save(input: SleepInput) {
    setSubmitted(true)
    try {
      if (entry) await update(entry, input)
      else await create(input)
      close()
    } catch (error) {
      setSubmitted(false)
      toast.error('Couldn’t save your sleep', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function remove(target: Sleep) {
    await repositories.sleep.remove(target.id)
    toast.success('Sleep deleted')
    close()
  }

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && close()}
      title={isEdit ? 'Edit sleep' : 'Log sleep'}
      footer={
        entry !== null || !isEdit ? (
          <div className="flex gap-2">
            {entry && (
              <ConfirmDelete
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete this night?"
                onConfirm={() => remove(entry)}
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-lg"
                    className="size-12 rounded-full"
                    aria-label="Delete sleep"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </Button>
                }
              />
            )}
            <Button
              type="submit"
              form={SLEEP_FORM_ID}
              disabled={loading || submitted}
              className="h-12 flex-1 rounded-full bg-sleep text-base text-on-accent hover:bg-sleep/90"
            >
              {isEdit ? 'Save changes' : 'Save sleep'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="h-96" aria-busy="true" />
      ) : isEdit && entry === null ? (
        <p className="py-10 text-center text-muted-foreground">
          This night doesn’t exist anymore. It may have been deleted.
        </p>
      ) : (
        <SleepForm
          key={entry?.id ?? 'new'}
          defaultValues={entry ? sleepToForm(entry) : emptySleepForm(today, latest ?? undefined)}
          loggedNights={loggedNights}
          editingId={entry?.id}
          targetMin={targetMin}
          onSubmit={save}
        />
      )}
    </FormSheet>
  )
}

async function create(input: SleepInput) {
  const created = await repositories.sleep.create(input)
  toast.success('Sleep logged', {
    action: { label: 'Undo', onClick: () => void repositories.sleep.remove(created.id) },
  })
}

async function update(previous: Sleep, input: SleepInput) {
  await repositories.sleep.update(previous.id, input)
  toast.success('Changes saved', {
    action: {
      label: 'Undo',
      onClick: () => void repositories.sleep.update(previous.id, sleepToInput(previous)),
    },
  })
}
