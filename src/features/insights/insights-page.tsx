import { Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SectionCard } from '@/components/common/section-card'
import { InsightList } from '@/features/insights/insight-list'
import { useInsights } from '@/features/insights/use-insights'
import type { InsightDomain } from '@/lib/calculations/insights'

const SECTIONS: Array<{ domain: InsightDomain; title: string }> = [
  { domain: 'workout', title: 'Training' },
  { domain: 'sleep', title: 'Sleep' },
  { domain: 'spending', title: 'Spending' },
  { domain: 'cross', title: 'Sleep and training' },
]

export function InsightsPage() {
  const insights = useInsights()

  return (
    <>
      <PageHeader title="Insights" backTo="/" />
      {insights === undefined ? (
        <PageSkeleton />
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Not enough data yet"
          description="After a week or two of logging, patterns in your training, sleep and spending show up here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {SECTIONS.map(({ domain, title }) => {
            const items = insights.filter((i) => i.domain === domain)
            if (items.length === 0) return null
            return (
              <SectionCard key={domain} title={title}>
                <InsightList insights={items} />
              </SectionCard>
            )
          })}
          <p className="px-1 text-sm text-muted-foreground">
            Insights come from what you’ve logged on this device. Each one appears only once there’s
            enough data behind it.
          </p>
        </div>
      )}
    </>
  )
}
