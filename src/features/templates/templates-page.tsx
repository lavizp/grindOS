import { ChevronRight, ClipboardList, Plus } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { Button } from '@/components/ui/button'
import type { Exercise, WorkoutTemplate } from '@/db/schema'
import { useExercises, useTemplates } from '@/hooks/use-data'

/** /settings/templates: saved routines, like "Push" with its exercises and sets. */
export function TemplatesPage() {
  const templates = useTemplates()
  const exercises = useExercises({ includeArchived: true })

  return (
    <>
      <PageHeader
        title="Templates"
        backTo="/settings"
        actions={
          <Button variant="ghost" size="icon-lg" aria-label="Add template" asChild>
            <Link to="new">
              <Plus className="size-5" aria-hidden />
            </Link>
          </Button>
        }
      />
      {templates === undefined || exercises === undefined ? (
        <PageSkeleton />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No templates yet"
          description="Save a routine, like Push with its exercises and sets, then start a workout from it in one tap."
          action={
            <Button asChild className="h-11 rounded-full px-5">
              <Link to="new">
                <Plus data-icon="inline-start" aria-hidden />
                Add template
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <SectionCard title="Templates" aside={`${templates.length}`}>
            <TemplateList templates={templates} exercises={exercises} />
          </SectionCard>
          <p className="px-1 text-sm text-muted-foreground">
            Start one when logging a workout, or save a logged workout as a template.
          </p>
        </div>
      )}
      <Outlet />
    </>
  )
}

function TemplateList({
  templates,
  exercises,
}: {
  templates: WorkoutTemplate[]
  exercises: Exercise[]
}) {
  const names = new Map(exercises.map((e) => [e.id, e.name]))
  return (
    <ul>
      {templates.map((template) => {
        const sets = template.entries.reduce((total, e) => total + e.sets.length, 0)
        const count = template.entries.length
        return (
          <li key={template.id}>
            <Link
              to={template.id}
              className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{template.name}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {count === 0
                    ? 'No exercises'
                    : `${count} ${count === 1 ? 'exercise' : 'exercises'}, ${sets} ${sets === 1 ? 'set' : 'sets'}: ${template.entries
                        .map((e) => names.get(e.exerciseId) ?? 'Unknown exercise')
                        .join(', ')}`}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
