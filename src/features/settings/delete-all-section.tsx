import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/db'
import { deleteAllData } from '@/db/backup'
import { clearDraft } from '@/features/workouts/workout-draft'

const CONFIRM_WORD = 'delete'

export function DeleteAllSection() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD

  async function run() {
    setDeleting(true)
    try {
      await deleteAllData(db)
      clearDraft()
      setOpen(false)
      toast.success('All data deleted')
    } catch (error) {
      toast.error('Couldn’t delete your data', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section
      aria-labelledby="delete-heading"
      className="rounded-2xl border border-destructive/30 p-4"
    >
      <h2 id="delete-heading" className="font-sans text-base font-semibold">
        Delete all data
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Removes every workout, night and payment from this device and resets categories, exercises
        and settings. Export a backup first if you might want them back.
      </p>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setTyped('')
        }}
      >
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" className="mt-3 h-11 w-full rounded-xl">
            Delete all data
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete everything?</AlertDialogTitle>
            <AlertDialogDescription>
              This can’t be undone. Type “{CONFIRM_WORD}” to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            aria-label={`Type ${CONFIRM_WORD} to confirm`}
            autoComplete="off"
            autoCapitalize="none"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="h-11 rounded-xl"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={!confirmed || deleting}
              onClick={() => void run()}
            >
              Delete everything
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
