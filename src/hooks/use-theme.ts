import { useEffect, useSyncExternalStore } from 'react'
import type { Theme } from '@/db/schema'
import { useSettings } from '@/hooks/use-data'
import { applyTheme, darkQuery, resolveTheme, type ResolvedTheme } from '@/lib/theme'

function subscribe(onChange: () => void) {
  const query = darkQuery()
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getPrefersDark = () => darkQuery().matches

/** Keeps the document theme in sync with Settings and the OS preference. */
export function useThemeSync(): ResolvedTheme {
  const theme: Theme | undefined = useSettings()?.theme
  const prefersDark = useSyncExternalStore(subscribe, getPrefersDark)

  // Until settings load, trust what the inline script in index.html applied.
  const resolved: ResolvedTheme = theme
    ? resolveTheme(theme, prefersDark)
    : document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'

  useEffect(() => {
    if (theme) applyTheme(theme)
  }, [theme, prefersDark])

  return resolved
}
