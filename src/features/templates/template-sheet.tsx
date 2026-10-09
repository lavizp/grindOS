import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { FormSheet } from '@/components/common/form-sheet'
import { Button } from '@/components/ui/button'
import { repositories } from '@/db'
import { DuplicateRecordError } from '@/db/repositories'
import type { WorkoutInput, WorkoutTemplate } from '@/db/schema'
import { useExercises, useRecentWorkouts, useWeightUnit } from '@/hooks/use-data'
import { useCloseRoute } from '@/hooks/use-close-route'
import { WORKOUT_FORM_ID, WorkoutForm } from '@/features/workouts/workout-form'
import { templateToForm, toTemplateInput } from '@/features/workouts/workout-form-schema'

/** /settings/templates/new and /settings/templates/:id, over the Templates page. */
export function TemplateSheet() {
  const { id } = useParams()
  const close = useCloseRoute('/settings/templates')
  const settingsUnit = useWeightUnit()
  const exercises = useExercises({ includeArchived: true })
  const history = useRecentWorkouts()
  // null = not found, undefined = still loading.
  const template = useLiveQuery(
    async () => (id ? ((await repositories.templates.getById(id)) ?? null) : null),
    [id],
  )
  const isEdit = id !== undefined
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loading = exercises === undefined || history === undefined || template === undefined
  const unit = template?.unit ?? settingsUnit

  async function save(input: WorkoutInput) {
    setSaving(true)
    try {
      const values = toTemplateInput(input)
      if (template) await repositories.templates.update(template.id, values)
      else await repositories.templates.create(values)
      toast.success(template ? 'Changes saved' : `${values.name} template saved`)
      close()
    } catch (error) {
      toast.error('Couldn’t save the template', {
        description:
          error instanceof DuplicateRecordError
            ? 'There’s already a template with that name.'
            : error instanceof Error
              ? error.message
              : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  async function remove(target: WorkoutTemplate) {
    await repositories.templates.remove(target.id)
    toast.success(`${target.name} template deleted`)
    close()
  }

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && close()}
      title={isEdit ? 'Edit template' : 'New template'}
      footer={
        template !== null || !isEdit ? (
          <div className="flex gap-2">
            {template && (
              <ConfirmDelete
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={`Delete the ${template.name} template?`}
                description="Workouts you logged from it stay. This can’t be undone."
                onConfirm={() => remove(template)}
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-lg"
                    className="size-12 rounded-full"
                    aria-label="Delete template"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </Button>
                }
              />
            )}
            <Button
              type="submit"
              form={WORKOUT_FORM_ID}
              disabled={loading || saving}
              className="h-12 flex-1 rounded-full bg-workout text-base text-on-accent hover:bg-workout/90"
            >
              {isEdit ? 'Save changes' : 'Save template'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="h-96" aria-busy="true" />
      ) : isEdit && template === null ? (
        <p className="py-10 text-center text-muted-foreground">
          This template doesn’t exist anymore. It may have been deleted.
        </p>
      ) : (
        <WorkoutForm
          key={template?.id ?? 'new'}
          variant="template"
          defaultValues={templateToForm(template ?? undefined)}
          unit={unit}
          exercises={exercises}
          history={history}
          onSubmit={save}
          createExercise={(name, kind) => repositories.exercises.findOrCreate(name, kind)}
        />
      )}
    </FormSheet>
  )
}
