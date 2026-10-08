import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { Button } from '@/components/ui/button'
import { repositories } from '@/db'
import type { Category } from '@/db/schema'
import { useCategories } from '@/hooks/use-data'
import { CategorySheet } from '@/features/settings/category-sheet'
import { CategoryIcon } from '@/features/spending/category-icon'

/** /settings/categories: add, edit, reorder, archive and restore payment categories. */
export function CategoriesPage() {
  const all = useCategories({ includeArchived: true })
  // undefined = closed, null = adding, a category = editing it.
  const [editing, setEditing] = useState<Category | null | undefined>(undefined)

  const active = all?.filter((c) => !c.archived) ?? []
  const archived = all?.filter((c) => c.archived) ?? []

  async function move(index: number, to: number) {
    const ids = active.map((c) => c.id)
    const [id] = ids.splice(index, 1)
    ids.splice(to, 0, id)
    await repositories.categories.reorder(ids)
  }

  async function restore(category: Category) {
    await repositories.categories.update(category.id, { archived: false })
    toast.success(`${category.name} restored`)
  }

  return (
    <>
      <PageHeader
        title="Categories"
        backTo="/settings"
        actions={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Add category"
            onClick={() => setEditing(null)}
          >
            <Plus className="size-5" aria-hidden />
          </Button>
        }
      />
      {all === undefined ? (
        <PageSkeleton />
      ) : (
        <div className="flex flex-col gap-4">
          <SectionCard title="In use" aside={`${active.length}`}>
            <ul>
              {active.map((category, index) => (
                <li key={category.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(category)}
                    className="-ml-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CategoryIcon icon={category.icon} color={category.color} />
                    <span className="truncate font-medium">{category.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    aria-label={`Move ${category.name} up`}
                    onClick={() => void move(index, index - 1)}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === active.length - 1}
                    aria-label={`Move ${category.name} down`}
                    onClick={() => void move(index, index + 1)}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </SectionCard>

          {archived.length > 0 && (
            <SectionCard title="Archived" aside="Hidden when adding payments">
              <ul>
                {archived.map((category) => (
                  <li key={category.id} className="flex items-center gap-3 py-2">
                    <CategoryIcon icon={category.icon} color={category.color} />
                    <span className="min-w-0 flex-1 truncate font-medium text-muted-foreground">
                      {category.name}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      aria-label={`Restore ${category.name}`}
                      onClick={() => void restore(category)}
                    >
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <p className="px-1 text-sm text-muted-foreground">
            Archiving keeps a category on the payments that use it, and hides it when adding new
            ones.
          </p>
        </div>
      )}
      <CategorySheet
        category={editing ?? null}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
      />
    </>
  )
}
