import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { FormSheet } from '@/components/common/form-sheet'
import { Button } from '@/components/ui/button'
import { repositories } from '@/db'
import type { BodyWeight, BodyWeightInput } from '@/db/schema'
import { useWeightUnit } from '@/hooks/use-data'
import { useCloseRoute } from '@/hooks/use-close-route'
import { BODY_WEIGHT_FORM_ID, BodyWeightForm } from '@/features/body-weight/body-weight-form'
import {
  bodyWeightToForm,
  bodyWeightToInput,
  emptyBodyWeightForm,
} from '@/features/body-weight/body-weight-form-schema'
import { convertWeight } from '@/lib/calculations/workouts'
import { todayKey } from '@/lib/dates'

/** /workouts/body-weight/new and /workouts/body-weight/:id, over the Body weight page. */
export function BodyWeightSheet() {
  const { id } = useParams()
  const close = useCloseRoute('/workouts/body-weight')
  const settingsUnit = useWeightUnit()
  const loggedDays = useLiveQuery(() => repositories.bodyWeights.loggedDays(), [])
  const latest = useLiveQuery(async () => (await repositories.bodyWeights.getLatest()) ?? null, [])
  // null = not found, undefined = still loading.
  const entry = useLiveQuery(
    async () => (id ? ((await repositories.bodyWeights.getById(id)) ?? null) : null),
    [id],
  )
  const [submitted, setSubmitted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isEdit = id !== undefined
  const loading = loggedDays === undefined || latest === undefined || entry === undefined
  const unit = entry?.unit ?? settingsUnit

  // One weigh-in per day: logging today again opens today's entry instead.
  const today = todayKey()
  const existingToday = !isEdit && !submitted ? loggedDays?.get(today) : undefined
  if (existingToday) return <Navigate to={`/workouts/body-weight/${existingToday}`} replace />

  async function save(input: BodyWeightInput) {
    setSubmitted(true)
    try {
      if (entry) await update(entry, input)
      else await create(input)
      close()
    } catch (error) {
      setSubmitted(false)
      toast.error('Couldn’t save your weight', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function remove(target: BodyWeight) {
    await repositories.bodyWeights.remove(target.id)
    toast.success('Weigh-in deleted')
    close()
  }

  const lastWeight = latest
    ? Math.round(convertWeight(latest.weight, latest.unit, unit) * 10) / 10
    : undefined

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && close()}
      title={isEdit ? 'Edit body weight' : 'Log body weight'}
      footer={
        entry !== null || !isEdit ? (
          <div className="flex gap-2">
            {entry && (
              <ConfirmDelete
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete this weigh-in?"
                onConfirm={() => remove(entry)}
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-lg"
                    className="size-12 rounded-full"
                    aria-label="Delete weigh-in"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </Button>
                }
              />
            )}
            <Button
              type="submit"
              form={BODY_WEIGHT_FORM_ID}
              disabled={loading || submitted}
              className="h-12 flex-1 rounded-full bg-workout text-base text-on-accent hover:bg-workout/90"
            >
              {isEdit ? 'Save changes' : 'Save weight'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="h-64" aria-busy="true" />
      ) : isEdit && entry === null ? (
        <p className="py-10 text-center text-muted-foreground">
          This weigh-in doesn’t exist anymore. It may have been deleted.
        </p>
      ) : (
        <BodyWeightForm
          key={entry?.id ?? 'new'}
          defaultValues={entry ? bodyWeightToForm(entry) : emptyBodyWeightForm(today)}
          unit={unit}
          loggedDays={loggedDays}
          editingId={entry?.id}
          lastWeight={lastWeight}
          onSubmit={save}
        />
      )}
    </FormSheet>
  )
}

async function create(input: BodyWeightInput) {
  const created = await repositories.bodyWeights.create(input)
  toast.success('Weight logged', {
    action: { label: 'Undo', onClick: () => void repositories.bodyWeights.remove(created.id) },
  })
}

async function update(previous: BodyWeight, input: BodyWeightInput) {
  await repositories.bodyWeights.update(previous.id, input)
  toast.success('Changes saved', {
    action: {
      label: 'Undo',
      onClick: () => void repositories.bodyWeights.update(previous.id, bodyWeightToInput(previous)),
    },
  })
}
