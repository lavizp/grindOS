import { DomainPage } from '@/components/common/domain-page'

export function SleepPage() {
  return (
    <DomainPage
      domain="sleep"
      emptyTitle="No nights logged"
      emptyDescription="Log when you went to bed and woke up. Averages and consistency show here."
    />
  )
}
