import { useState, type FormEvent } from 'react'
import { Archive } from 'lucide-react'
import { toast } from 'sonner'
import { FormSheet } from '@/components/common/form-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { repositories } from '@/db'
import type { Category } from '@/db/schema'
import { CategoryIcon } from '@/features/spending/category-icon'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/features/spending/category-icons'
import { cn } from '@/lib/utils'

const FORM_ID = 'category-form'
const MAX_NAME = 40

interface CategorySheetProps {
  /** The category to edit, or null to add one. */
  category: Category | null
  open: boolean
  onClose: () => void
}

export function CategorySheet({ category, open, onClose }: CategorySheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={category ? 'Edit category' : 'Add category'}
      footer={
        <div className="flex gap-2">
          {category && !category.archived && (
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full px-5"
              onClick={async () => {
                await repositories.categories.archive(category.id)
                toast.success(`${category.name} archived`, {
                  description: 'Its payments keep the category.',
                  action: {
                    label: 'Undo',
                    onClick: () =>
                      void repositories.categories.update(category.id, { archived: false }),
                  },
                })
                onClose()
              }}
            >
              <Archive data-icon="inline-start" aria-hidden />
              Archive
            </Button>
          )}
          <Button type="submit" form={FORM_ID} className="h-12 flex-1 rounded-full text-base">
            {category ? 'Save changes' : 'Add category'}
          </Button>
        </div>
      }
    >
      {/* Keyed so reopening starts from the category's current values. */}
      {open && <CategoryForm key={category?.id ?? 'new'} category={category} onDone={onClose} />}
    </FormSheet>
  )
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? 'circle-ellipsis')
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name the category')
      return
    }
    if (category) {
      await repositories.categories.update(category.id, { name: trimmed, icon, color })
      toast.success('Changes saved')
    } else {
      await repositories.categories.create({ name: trimmed, icon, color })
      toast.success(`${trimmed} added`)
    }
    onDone()
  }

  return (
    <form id={FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex items-end gap-3">
        <CategoryIcon icon={icon} color={color} size="lg" />
        <div className="min-w-0 flex-1">
          <Label htmlFor="category-name" className="mb-2">
            Name
          </Label>
          <Input
            id="category-name"
            value={name}
            maxLength={MAX_NAME}
            autoComplete="off"
            autoCapitalize="words"
            aria-invalid={!!error}
            aria-describedby={error ? 'category-name-error' : undefined}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            className="h-11 rounded-xl bg-card"
          />
        </div>
      </div>
      {error && (
        <p id="category-name-error" role="alert" className="-mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Color</legend>
        <div role="radiogroup" aria-label="Color" className="grid grid-cols-6 gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn(
                'aspect-square rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
                color === c && 'ring-2 ring-foreground ring-offset-2 ring-offset-popover',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Icon</legend>
        <div role="radiogroup" aria-label="Icon" className="grid grid-cols-6 gap-2">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={icon === key}
              aria-label={key.replace(/-/g, ' ')}
              onClick={() => setIcon(key)}
              className={cn(
                'grid aspect-square place-items-center rounded-xl border outline-none focus-visible:ring-2 focus-visible:ring-ring',
                icon === key ? 'border-foreground bg-card' : 'border-transparent bg-muted/60',
              )}
              style={icon === key ? { color } : undefined}
            >
              <Icon className="size-5" aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
    </form>
  )
}
