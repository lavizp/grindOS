import { useMemo } from 'react'
import { CloudOff, Lock } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/common/segmented-control'
import { repositories } from '@/db'
import type { Settings, WeightUnit } from '@/db/schema'
import { currencyOptions } from '@/features/settings/options'

/** First run: confirm the two settings that shape everything else, then start. */
export function Welcome({ settings }: { settings: Settings }) {
  const currencies = useMemo(() => currencyOptions(), [])

  return (
    <section aria-labelledby="welcome-heading" className="flex flex-col pt-4">
      <img src="/favicon.svg" alt="" className="size-16 rounded-2xl" />
      <h1 id="welcome-heading" className="mt-6 text-title font-semibold">
        Welcome to grindOS
      </h1>
      <p className="mt-2 text-muted-foreground">
        Log workouts, sleep and spending in a few taps, and see how they add up.
      </p>
      <ul className="mt-6 flex flex-col gap-3 text-sm">
        <li className="flex gap-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          Everything stays on this device. There’s no account.
        </li>
        <li className="flex gap-3">
          <CloudOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          It works offline, and best from your Home Screen.
        </li>
      </ul>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-card p-4">
        <div>
          <label htmlFor="welcome-currency" className="mb-2 block font-medium">
            Currency
          </label>
          <select
            id="welcome-currency"
            value={settings.currency}
            onChange={(e) => void repositories.settings.update({ currency: e.target.value })}
            className="h-11 w-full rounded-xl border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span id="welcome-unit" className="font-medium">
            Weights in
          </span>
          <SegmentedControl<WeightUnit>
            aria-labelledby="welcome-unit"
            value={settings.weightUnit}
            onValueChange={(weightUnit) => void repositories.settings.update({ weightUnit })}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
        </div>
        <p className="text-sm text-muted-foreground">You can change these later in Settings.</p>
      </div>

      <Button
        type="button"
        onClick={() => void repositories.settings.update({ onboardedAt: Date.now() })}
        className="mt-6 h-12 rounded-full text-base"
      >
        Get started
      </Button>
      <Button asChild variant="ghost" className="mt-2 h-11 rounded-full">
        <Link to="/settings">Restore from a backup</Link>
      </Button>
    </section>
  )
}
