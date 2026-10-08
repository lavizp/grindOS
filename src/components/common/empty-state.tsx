import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DOMAINS, type Domain } from '@/lib/domains'

interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  /** Uses the domain's icon and accent unless `icon` is given. */
  domain?: Domain
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  domain,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const config = domain ? DOMAINS[domain] : undefined
  const Icon = icon ?? config?.icon

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            'mb-4 grid size-14 place-items-center rounded-2xl',
            config?.softBg ?? 'bg-muted',
          )}
        >
          <Icon className={cn('size-7', config?.text ?? 'text-muted-foreground')} aria-hidden />
        </span>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
