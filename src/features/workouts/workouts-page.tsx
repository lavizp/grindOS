import { DomainEmptyState, DomainPage } from '@/components/common/domain-page'
import { usePeriod } from '@/hooks/use-period'

export function WorkoutsPage() {
  const period = usePeriod()

  return (
    <DomainPage domain="workout" period={period}>
      <DomainEmptyState
        domain="workout"
        title="No workouts yet"
        description="Log your sets and reps. Frequency, progress and records show here."
      />
    </DomainPage>
  )
}
