import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { PeriodSwitcher } from '@/components/common/period-switcher'
import { Button } from '@/components/ui/button'
import { usePeriod } from '@/hooks/use-period'
import { DOMAINS, type Domain } from '@/lib/domains'

interface DomainPageProps {
  domain: Domain
  emptyTitle: string
  emptyDescription: string
  children?: ReactNode
}

/** Shared frame for the Workout, Sleep and Spending tabs. */
export function DomainPage({ domain, emptyTitle, emptyDescription, children }: DomainPageProps) {
  const config = DOMAINS[domain]
  const { period, setPeriod, anchor, setAnchor, range, weekStartsOn } = usePeriod()

  return (
    <>
      <PageHeader
        title={config.label}
        actions={
          <Button asChild variant="ghost" size="icon-lg" aria-label={`Log ${config.entryLabel}`}>
            <Link to={config.newPath}>
              <Plus className="size-5" aria-hidden />
            </Link>
          </Button>
        }
      />
      <PeriodSwitcher
        period={period}
        onPeriodChange={setPeriod}
        anchor={anchor}
        onAnchorChange={setAnchor}
        range={range}
        weekStartsOn={weekStartsOn}
        className="mb-4"
      />
      {children ?? (
        <EmptyState
          domain={domain}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Button asChild size="lg" className="h-11 rounded-full px-5">
              <Link to={config.newPath}>Log {config.entryLabel}</Link>
            </Button>
          }
        />
      )}
      <Outlet />
    </>
  )
}
