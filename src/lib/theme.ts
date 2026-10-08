import type { Theme } from '@/db/schema'

export type ResolvedTheme = 'light' | 'dark'

// Settings live in IndexedDB, which loads too late to avoid a flash of the
// wrong theme. A copy in localStorage is read by the inline script in index.html.
export const THEME_STORAGE_KEY = 'grindos-theme'

const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#f4f5f7', dark: '#101216' }

export const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return prefersDark ? 'dark' : 'light'
  return theme
}

export function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme, darkQuery().matches)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved])
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (private mode); the class is still applied.
  }
  return resolved
}
