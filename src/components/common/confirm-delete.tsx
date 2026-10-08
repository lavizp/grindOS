import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ConfirmDeleteProps {
  /** e.g. "Delete this payment?" */
  title: ReactNode
  description?: ReactNode
  onConfirm: () => void | Promise<void>
  /** Element that opens the dialog. Omit when controlling `open` yourself. */
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  confirmLabel?: string
}

export function ConfirmDelete({
  title,
  description = 'This can’t be undone.',
  onConfirm,
  trigger,
  open,
  onOpenChange,
  confirmLabel = 'Delete',
}: ConfirmDeleteProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void onConfirm()}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
