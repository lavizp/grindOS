import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { db, repositories } from '@/db'
import {
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
  summarizeBackup,
  type Backup,
  type ImportMode,
} from '@/db/backup'
import { daysSinceBackup } from '@/lib/calculations/dashboard'
import { saveFile } from '@/lib/save-file'

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

function describeLastBackup(lastBackupAt: number | undefined, now: Date): string {
  const days = daysSinceBackup(lastBackupAt, now)
  if (days === null) return 'You haven’t backed up yet.'
  const when = format(new Date(lastBackupAt!), 'MMM d, yyyy')
  if (days === 0) return `Last backup: today (${when}).`
  return `Last backup: ${plural(days, 'day')} ago (${when}).`
}

export function BackupSection({ lastBackupAt }: { lastBackupAt: number | undefined }) {
  const [now] = useState(() => new Date())
  const [exporting, setExporting] = useState(false)
  const [pending, setPending] = useState<Backup | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function exportData() {
    setExporting(true)
    try {
      const backup = await exportBackup(db)
      const file = new File([JSON.stringify(backup)], backupFileName(backup.exportedAt), {
        type: 'application/json',
      })
      const outcome = await saveFile(file)
      if (outcome === 'cancelled') return
      await repositories.settings.update({ lastBackupAt: backup.exportedAt })
      toast.success('Backup saved', {
        description:
          outcome === 'shared' ? 'Keep it somewhere safe, like Files or iCloud Drive.' : file.name,
      })
    } catch (error) {
      toast.error('Couldn’t create the backup', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setExporting(false)
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return
    const result = parseBackup(await file.text())
    if (result.ok) setPending(result.backup)
    else toast.error('Couldn’t read that file', { description: result.error })
  }

  async function runImport(mode: ImportMode) {
    if (!pending) return
    setImporting(true)
    try {
      const { written } = await importBackup(db, pending, mode)
      setPending(null)
      toast.success(mode === 'replace' ? 'Backup restored' : 'Backup merged', {
        description: `${plural(written, 'record')} ${mode === 'replace' ? 'restored' : 'added or updated'}.`,
      })
    } catch (error) {
      toast.error('Import failed. Nothing was changed.', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setImporting(false)
    }
  }

  const summary = pending && summarizeBackup(pending)

  return (
    <section aria-labelledby="backup-heading" className="rounded-2xl bg-card p-4">
      <h2 id="backup-heading" className="font-sans text-base font-semibold">
        Backup
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything lives only on this device. A backup is one file you can keep elsewhere and import
        here or on another device.
      </p>
      <p className="mt-3 text-sm font-medium">{describeLastBackup(lastBackupAt, now)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" onClick={exportData} disabled={exporting} className="h-11 rounded-xl">
          <Download data-icon="inline-start" aria-hidden />
          Export backup
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInput.current?.click()}
          className="h-11 rounded-xl"
        >
          <Upload data-icon="inline-start" aria-hidden />
          Import backup
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label="Backup file"
        className="hidden"
        onChange={(e) => {
          void pickFile(e.target.files?.[0])
          // Picking the same file again should still trigger a change.
          e.target.value = ''
        }}
      />

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && `Made ${format(new Date(pending.exportedAt), 'MMM d, yyyy, p')}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {summary && (
            <dl className="grid grid-cols-3 gap-3 rounded-xl bg-muted/60 p-3 text-sm">
              {(
                [
                  ['Workouts', summary.workouts],
                  ['Nights', summary.sleep],
                  ['Payments', summary.payments],
                  ['Weigh-ins', summary.bodyWeights],
                  ['Exercises', summary.exercises],
                  ['Templates', summary.templates],
                  ['Categories', summary.categories],
                ] as const
              ).map(([label, count]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular font-medium">{count}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Merge</span> keeps what’s on this device
              and adds the backup. Where both have the same entry, the newer edit wins.
            </p>
            <p>
              <span className="font-medium text-foreground">Replace all</span> deletes everything on
              this device first, settings included.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={importing}
              onClick={() => void runImport('replace')}
            >
              Replace all
            </Button>
            <Button type="button" disabled={importing} onClick={() => void runImport('merge')}>
              Merge
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
