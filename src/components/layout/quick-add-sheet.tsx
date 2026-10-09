import { ChevronRight, Scale, type LucideIcon } from 'lucide-react'
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

interface Item {
  label: string
  hint: string
  icon: LucideIcon
  path: string
  /** Static class strings so Tailwind can see them. */
  text: string
  softBg: string
}

const ITEMS: Item[] = DOMAIN_ORDER.flatMap((domain) => {
  const { addLabel, icon, newPath, text, softBg } = DOMAINS[domain]
  const item = { label: addLabel, hint: HINTS[domain], icon, path: newPath, text, softBg }
  if (domain !== 'workout') return [item]
  // Body weight belongs with workouts.
  return [
    item,
    {
      label: 'Log body weight',
      hint: 'Your weight today',
      icon: Scale,
      path: '/workouts/body-weight/new',
      text,
      softBg,
    },
  ]
})

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
          {ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    navigate(item.path)
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl bg-background p-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
                >
                  <span className={cn('grid size-12 place-items-center rounded-xl', item.softBg)}>
                    <Icon className={cn('size-6', item.text)} aria-hidden />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-sm text-muted-foreground">{item.hint}</span>
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
