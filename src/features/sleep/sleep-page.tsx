import { DomainEmptyState, DomainPage } from '@/components/common/domain-page'
import { usePeriod } from '@/hooks/use-period'

export function SleepPage() {
  const period = usePeriod()

  return (
    <DomainPage domain="sleep" period={period}>
      <DomainEmptyState
        domain="sleep"
        title="No nights logged"
        description="Log when you went to bed and woke up. Averages and consistency show here."
      />
    </DomainPage>
  )
}
