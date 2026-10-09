import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { repositories } from '@/db'

/** Development builds only: fill the app with demo data to check charts and insights. */
export function DemoDataSection() {
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { seedDemoData } = await import('@/dev/demo-data')
      const { workouts, nights, payments, weighIns } = await seedDemoData(repositories)
      toast.success('Demo data loaded', {
        description: `${workouts} workouts, ${weighIns} weigh-ins, ${nights} nights and ${payments} payments.`,
      })
    } catch (error) {
      toast.error('Couldn’t load demo data', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section aria-labelledby="dev-heading" className="rounded-2xl border border-dashed p-4">
      <h2 id="dev-heading" className="font-sans text-base font-semibold">
        Development
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Adds about 90 days of workouts, body weight, sleep and payments. Best on an empty app;
        delete all data afterwards to start over.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => void load()}
        className="mt-3 h-11 w-full rounded-xl"
      >
        Load demo data
      </Button>
    </section>
  )
}
