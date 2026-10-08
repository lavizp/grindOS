import { Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'

export function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" backTo="/" />
      <EmptyState
        icon={Sparkles}
        title="Not enough data yet"
        description="After a week or two of logging, patterns in your training, sleep and spending show up here."
      />
    </>
  )
}
