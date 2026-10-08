import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <EmptyState
      className="mt-16"
      icon={Compass}
      title="Page not found"
      description="This link doesn’t point to anything in grindOS."
      action={
        <Button asChild size="lg" className="h-11 rounded-full px-5">
          <Link to="/">Go home</Link>
        </Button>
      }
    />
  )
}
