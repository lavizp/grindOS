import type { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface FormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  /** Sticky actions, e.g. the Save button. */
  footer?: ReactNode
  className?: string
}

/** A full-height bottom sheet for entry forms, styled like an iOS modal sheet. */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'mx-auto max-h-[calc(100dvh-env(safe-area-inset-top,0px)-0.75rem)] max-w-lg gap-0 rounded-t-3xl border-0',
          className,
        )}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted" />
        <SheetHeader className="px-5 pt-2 pb-3">
          <SheetTitle className="pr-8 text-xl font-semibold">{title}</SheetTitle>
          <SheetDescription className={cn(!description && 'sr-only')}>
            {description ?? title}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {children}
        </div>
        {footer && (
          <SheetFooter className="border-t bg-popover px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
