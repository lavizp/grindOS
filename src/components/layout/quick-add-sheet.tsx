import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { DOMAIN_ORDER, DOMAINS } from '@/lib/domains'

const HINTS = {
  workout: 'Sets, reps and weight',
  sleep: 'Bedtime and wake time',
  spending: 'Amount and category',
} as const

interface QuickAddSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps) {
  const navigate = useNavigate()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="pb-safe rounded-t-3xl border-0"
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted" />
        <SheetHeader className="px-5 pt-1 pb-0">
          <SheetTitle className="text-xl font-semibold">Add entry</SheetTitle>
          <SheetDescription>What do you want to log?</SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col gap-2 px-4 pb-6">
          {DOMAIN_ORDER.map((domain) => {
            const config = DOMAINS[domain]
            const Icon = config.icon
            return (
              <li key={domain}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    navigate(config.newPath)
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl bg-background p-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
                >
                  <span className={cn('grid size-12 place-items-center rounded-xl', config.softBg)}>
                    <Icon className={cn('size-6', config.text)} aria-hidden />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{config.addLabel}</span>
                    <span className="block text-sm text-muted-foreground">{HINTS[domain]}</span>
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
