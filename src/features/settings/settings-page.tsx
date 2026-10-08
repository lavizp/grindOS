import { PageHeader } from '@/components/common/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { repositories } from '@/db'
import type { Theme } from '@/db/schema'
import { useSettings } from '@/hooks/use-data'

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function SettingsPage() {
  const settings = useSettings()

  return (
    <>
      <PageHeader title="Settings" backTo="/" />
      <section className="flex items-center justify-between gap-4 rounded-2xl bg-card p-4">
        <h2 id="theme-label" className="font-sans font-medium">
          Appearance
        </h2>
        <Tabs
          value={settings?.theme ?? 'system'}
          onValueChange={(theme) => void repositories.settings.update({ theme: theme as Theme })}
        >
          <TabsList aria-labelledby="theme-label">
            {THEMES.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </section>
    </>
  )
}
