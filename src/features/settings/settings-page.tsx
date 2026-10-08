import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/page-header'
import { PageSkeleton } from '@/components/common/page-skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
            <Tabs
              value={settings.weightUnit}
              onValueChange={(unit) => save({ weightUnit: unit as WeightUnit })}
            >
              <TabsList aria-labelledby="unit-label">
                <TabsTrigger value="kg">kg</TabsTrigger>
                <TabsTrigger value="lb">lb</TabsTrigger>
              </TabsList>
            </Tabs>
          </SettingsRow>

          <SettingsRow label="Week starts on" labelId="week-label">
            <Tabs
              value={String(settings.weekStartsOn)}
              onValueChange={(day) => save({ weekStartsOn: Number(day) as 0 | 1 })}
            >
              <TabsList aria-labelledby="week-label">
                <TabsTrigger value="0">Sunday</TabsTrigger>
                <TabsTrigger value="1">Monday</TabsTrigger>
              </TabsList>
            </Tabs>
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
            <Tabs value={settings.theme} onValueChange={(theme) => save({ theme: theme as Theme })}>
              <TabsList aria-labelledby="theme-label">
                {THEMES.map(({ value, label }) => (
                  <TabsTrigger key={value} value={value}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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
