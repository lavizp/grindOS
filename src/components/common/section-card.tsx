import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title: ReactNode
  /** Right-aligned beside the title: a total, a link. */
  aside?: ReactNode
  children: ReactNode
  className?: string
}

export function SectionCard({ title, aside, children, className }: SectionCardProps) {
  return (
    <section className={cn('rounded-2xl bg-card p-4 text-card-foreground', className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-sans text-base font-semibold">{title}</h2>
        {aside && <div className="text-sm text-muted-foreground">{aside}</div>}
      </div>
      {children}
    </section>
  )
}
