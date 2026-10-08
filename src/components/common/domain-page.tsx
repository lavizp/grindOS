import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { PeriodSwitcher } from '@/components/common/period-switcher'
import { Button } from '@/components/ui/button'
import type { PeriodState } from '@/hooks/use-period'
import { DOMAINS, type Domain } from '@/lib/domains'

interface DomainPageProps {
  domain: Domain
  period: PeriodState
  children: ReactNode
}

/** Shared frame for the Workout, Sleep and Spending tabs. */
export function DomainPage({ domain, period, children }: DomainPageProps) {
  const config = DOMAINS[domain]

  return (
    <>
      <PageHeader
        title={config.label}
        actions={
          <Button asChild variant="ghost" size="icon-lg" aria-label={config.addLabel}>
            <Link to={config.newPath}>
              <Plus className="size-5" aria-hidden />
            </Link>
          </Button>
        }
      />
      <PeriodSwitcher
        period={period.period}
        onPeriodChange={period.setPeriod}
        anchor={period.anchor}
        onAnchorChange={period.setAnchor}
        range={period.range}
        weekStartsOn={period.weekStartsOn}
        className="mb-4"
      />
      {children}
      <Outlet />
    </>
  )
}

interface DomainEmptyStateProps {
  domain: Domain
  title: string
  description: string
}

export function DomainEmptyState({ domain, title, description }: DomainEmptyStateProps) {
  const config = DOMAINS[domain]
  return (
    <EmptyState
      domain={domain}
      title={title}
      description={description}
      action={
        <Button asChild size="lg" className="h-11 rounded-full px-5">
          <Link to={config.newPath}>{config.addLabel}</Link>
        </Button>
      }
    />
  )
}
