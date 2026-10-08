import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Loading</span>
      <Skeleton className="mt-6 h-8 w-40" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  )
}
