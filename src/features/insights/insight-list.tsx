import { ChevronRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import type { Insight, InsightDomain, InsightSeverity } from '@/lib/calculations/insights'
import { DOMAINS } from '@/lib/domains'
import { cn } from '@/lib/utils'

const SEVERITY: Record<InsightSeverity, { label: string; dot: string } | null> = {
  positive: { label: 'Good news', dot: 'bg-spending' },
  warning: { label: 'Worth a look', dot: 'bg-chart-4' },
  neutral: null,
}

function DomainTile({ domain }: { domain: InsightDomain }) {
  if (domain === 'cross') {
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
        <Sparkles className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
    )
  }
  const config = DOMAINS[domain]
  const Icon = config.icon
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', config.softBg)}>
      <Icon className={cn('size-5', config.text)} strokeWidth={1.75} aria-hidden />
    </span>
  )
}

export function InsightRow({ insight }: { insight: Insight }) {
  const severity = SEVERITY[insight.severity]
  const body = (
    <>
      <DomainTile domain={insight.domain} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-1.5 font-medium">
          {severity && (
            <>
              <span
                aria-hidden
                className={cn('mt-2 size-1.5 shrink-0 rounded-full', severity.dot)}
              />
              <span className="sr-only">{severity.label}: </span>
            </>
          )}
          <span>{insight.title}</span>
        </span>
        {insight.detail && (
          <span className="mt-0.5 block text-sm text-muted-foreground">{insight.detail}</span>
        )}
      </span>
      {insight.link && (
        <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </>
  )
  const className =
    '-mx-2 flex items-start gap-3 rounded-xl px-2 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring'
  return insight.link ? (
    <Link to={insight.link} className={cn(className, 'hover:bg-muted/60 active:bg-muted')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <ul>
      {insights.map((insight) => (
        <li key={insight.id}>
          <InsightRow insight={insight} />
        </li>
      ))}
    </ul>
  )
}
