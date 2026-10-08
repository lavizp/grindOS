import { History } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'

export function HistoryPage() {
  return (
    <>
      <PageHeader title="History" backTo="/" />
      <EmptyState
        icon={History}
        title="Nothing recorded yet"
        description="Every workout, night and payment you log appears here by day."
      />
    </>
  )
}
