import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  /** Small line under the title, e.g. today's date. */
  subtitle?: ReactNode
  /** Shows a back button that returns to this path (or the previous page). */
  backTo?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, backTo, actions, className }: PageHeaderProps) {
  const navigate = useNavigate()
  // The first location of a session has the key "default": there's nothing to go back to.
  const { key } = useLocation()

  return (
    <header className={cn('mb-6 flex items-end gap-3', className)}>
      <div className="min-w-0 flex-1">
        {backTo && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 -ml-2 text-muted-foreground"
            onClick={() => (key !== 'default' ? navigate(-1) : navigate(backTo))}
          >
            <ChevronLeft data-icon="inline-start" aria-hidden />
            Back
          </Button>
        )}
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        <h1 className="truncate text-title font-semibold">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  )
}
