import { useParams } from 'react-router'
import { FormSheet } from '@/components/common/form-sheet'
import { useCloseRoute } from '@/hooks/use-close-route'
import { cn } from '@/lib/utils'
import { DOMAINS, type Domain } from '@/lib/domains'

// Stand-in for the entry forms built in Steps 4–6. It proves the modal
// routes (/x/new, /x/:id) open over their list page and close back to it.

export function EntrySheetPlaceholder({ domain }: { domain: Domain }) {
  const { id } = useParams()
  const config = DOMAINS[domain]
  const close = useCloseRoute(config.path)
  const Icon = config.icon

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && close()}
      title={id ? `Edit ${config.entryLabel}` : config.addLabel}
    >
      <div className="flex flex-col items-center py-10 text-center">
        <span className={cn('mb-4 grid size-14 place-items-center rounded-2xl', config.softBg)}>
          <Icon className={cn('size-7', config.text)} aria-hidden />
        </span>
        <p className="max-w-xs text-sm text-muted-foreground">
          The {config.entryLabel} form isn’t built yet.
        </p>
      </div>
    </FormSheet>
  )
}
