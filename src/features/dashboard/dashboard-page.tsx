import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronRight, History, Settings, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DOMAIN_ORDER, DOMAINS } from '@/lib/domains'

function greeting(hour: number): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const [now] = useState(() => new Date())

  return (
    <>
      <PageHeader
        subtitle={format(now, 'EEEE, MMMM d')}
        title={greeting(now.getHours())}
        actions={
          <>
            <Button asChild variant="ghost" size="icon-lg" aria-label="History">
              <Link to="/history">
                <History className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-lg" aria-label="Insights">
              <Link to="/insights">
                <Sparkles className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-lg" aria-label="Settings">
              <Link to="/settings">
                <Settings className="size-5" aria-hidden />
              </Link>
            </Button>
          </>
        }
      />

      <section aria-labelledby="today-heading" className="flex flex-col gap-2">
        <h2 id="today-heading" className="mb-1 text-lg font-semibold">
          Today
        </h2>
        {DOMAIN_ORDER.map((domain) => {
          const config = DOMAINS[domain]
          const Icon = config.icon
          return (
            <Link
              key={domain}
              to={config.newPath}
              className="flex items-center gap-4 rounded-2xl bg-card p-3 transition-colors outline-none hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
            >
              <span className={cn('grid size-12 place-items-center rounded-xl', config.softBg)}>
                <Icon className={cn('size-6', config.text)} aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-medium">{config.label}</span>
                <span className="block text-sm text-muted-foreground">Nothing logged yet</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          )
        })}
      </section>
    </>
  )
}
