import { lazy, Suspense, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { SegmentedControl } from '@/components/common/segmented-control'
import { repositories } from '@/db'
import type { Theme, WeightUnit } from '@/db/schema'
import { useCategories, useExercises, useSettings } from '@/hooks/use-data'
import { BackupSection } from '@/features/settings/backup-section'
import { DeleteAllSection } from '@/features/settings/delete-all-section'
import { currencyOptions, sleepTargetOptions } from '@/features/settings/options'
import { SettingsRow } from '@/features/settings/settings-row'
import type { SettingsPatch } from '@/db/repositories/settings'

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Never part of a production build.
const DemoDataSection = import.meta.env.DEV
  ? lazy(() => import('@/dev/demo-data-section').then((m) => ({ default: m.DemoDataSection })))
  : () => null

const select =
  'h-10 max-w-48 rounded-xl border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring'

const save = (patch: SettingsPatch) => void repositories.settings.update(patch)

export function SettingsPage() {
  const settings = useSettings()
  const categories = useCategories()
  const exercises = useExercises()
  const currencies = useMemo(() => currencyOptions(), [])

  if (!settings) {
    return (
      <>
        <PageHeader title="Settings" backTo="/" />
        <PageSkeleton />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Settings" backTo="/" />
      <div className="flex flex-col gap-4">
        <section aria-label="Preferences" className="divide-y rounded-2xl bg-card p-4">
          <SettingsRow
            label="Currency"
            htmlFor="currency"
            hint="Amounts already logged aren’t converted."
          >
            <select
              id="currency"
              value={settings.currency}
              onChange={(e) => save({ currency: e.target.value })}
              className={select}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow
            label="Weight unit"
            labelId="unit-label"
            hint="For new workouts. Logged ones keep theirs."
          >
            <SegmentedControl<WeightUnit>
              aria-labelledby="unit-label"
              value={settings.weightUnit}
              onValueChange={(weightUnit) => save({ weightUnit })}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </SettingsRow>

          <SettingsRow label="Week starts on" labelId="week-label">
            <SegmentedControl
              aria-labelledby="week-label"
              value={String(settings.weekStartsOn)}
              onValueChange={(day) => save({ weekStartsOn: Number(day) as 0 | 1 })}
              options={[
                { value: '0', label: 'Sunday' },
                { value: '1', label: 'Monday' },
              ]}
            />
          </SettingsRow>

          <SettingsRow label="Sleep target" htmlFor="sleep-target">
            <select
              id="sleep-target"
              value={settings.sleepTargetMin}
              onChange={(e) => save({ sleepTargetMin: Number(e.target.value) })}
              className={select}
            >
              {sleepTargetOptions(settings.sleepTargetMin).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow label="Appearance" labelId="theme-label">
            <SegmentedControl<Theme>
              aria-labelledby="theme-label"
              value={settings.theme}
              onValueChange={(theme) => save({ theme })}
              options={THEMES}
            />
          </SettingsRow>
        </section>

        <nav aria-label="Manage" className="divide-y rounded-2xl bg-card px-4">
          <ManageLink
            to="/settings/categories"
            label="Payment categories"
            count={categories?.length}
          />
          <ManageLink to="/settings/exercises" label="Exercises" count={exercises?.length} />
        </nav>

        <BackupSection lastBackupAt={settings.lastBackupAt} />
        <DeleteAllSection />
        {import.meta.env.DEV && (
          <Suspense fallback={null}>
            <DemoDataSection />
          </Suspense>
        )}
      </div>
    </>
  )
}

function ManageLink({ to, label, count }: { to: string; label: string; count?: number }) {
  return (
    <Link
      to={to}
      className="-mx-4 flex items-center gap-3 px-4 py-3.5 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex-1 font-medium">{label}</span>
      {count !== undefined && (
        <span className="tabular text-sm text-muted-foreground">{count}</span>
      )}
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  )
}
