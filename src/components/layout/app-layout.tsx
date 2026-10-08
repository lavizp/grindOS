import { Suspense, useState } from 'react'
import { Outlet } from 'react-router'
import { BottomNav } from '@/components/layout/bottom-nav'
import { QuickAddSheet } from '@/components/layout/quick-add-sheet'
import { PageSkeleton } from '@/components/common/page-skeleton'

export function AppLayout() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-lg px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  )
}
