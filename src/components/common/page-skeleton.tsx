import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="mt-6 h-8 w-40" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  )
}
