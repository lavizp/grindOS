import { useState } from 'react'
import { Share, SquarePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isIos, isStandalone } from '@/lib/platform'

const DISMISSED_KEY = 'grindos-install-hint-dismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * iOS has no install prompt, so explain Add to Home Screen. Installing also
 * matters for data: Safari can clear storage for sites that aren't installed.
 */
export function InstallHint() {
  const [hidden, setHidden] = useState(() => !isIos() || isStandalone() || wasDismissed())
  if (hidden) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Without storage it just shows again next time.
    }
    setHidden(true)
  }

  return (
    <section
      aria-labelledby="install-heading"
      className="relative rounded-2xl bg-card p-4 pr-12 text-card-foreground"
    >
      <h2 id="install-heading" className="font-sans text-base font-semibold">
        Add grindOS to your Home Screen
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        It opens full screen, works offline, and keeps your data safer: Safari can clear data for
        sites that aren’t installed.
      </p>
      <ol className="mt-3 flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted">
            <Share className="size-4" aria-hidden />
          </span>
          Tap Share in Safari’s toolbar.
        </li>
        <li className="flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted">
            <SquarePlus className="size-4" aria-hidden />
          </span>
          Choose Add to Home Screen.
        </li>
      </ol>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-muted-foreground"
      >
        <X aria-hidden />
      </Button>
    </section>
  )
}
