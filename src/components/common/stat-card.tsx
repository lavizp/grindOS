import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DOMAINS, type Domain } from '@/lib/domains'

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  /** Supporting line: a comparison, target, or unit. */
  detail?: ReactNode
  domain?: Domain
  className?: string
  children?: ReactNode
}

/** One key number. Domain cards get a tinted icon and accent. */
export function StatCard({ label, value, detail, domain, className, children }: StatCardProps) {
  const config = domain ? DOMAINS[domain] : undefined
  const Icon = config?.icon

  return (
    <section className={cn('rounded-2xl bg-card p-4 text-card-foreground', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && (
          <span className={cn('grid size-6 place-items-center rounded-md', config.softBg)}>
            <Icon className={cn('size-3.5', config.text)} aria-hidden />
          </span>
        )}
        <h2 className="font-sans font-medium">{label}</h2>
      </div>
      <p className="tabular mt-2 font-heading text-display font-semibold">{value}</p>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      {children}
    </section>
  )
}
