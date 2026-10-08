import { DomainPage } from '@/components/common/domain-page'

export function SpendingPage() {
  return (
    <DomainPage
      domain="spending"
      emptyTitle="No payments yet"
      emptyDescription="Add what you spend as you go. Totals and categories build up here."
    />
  )
}
