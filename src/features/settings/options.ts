import { formatDuration } from '@/lib/formatters'

export interface CurrencyOption {
  code: string
  label: string
}

/**
 * Every currency this browser knows, sorted by code. The code comes first in
 * the label ("NPR (Nepalese Rupee)") so it still shows when the picker is narrow.
 */
export function currencyOptions(locale?: string): CurrencyOption[] {
  const names = new Intl.DisplayNames(locale, { type: 'currency' })
  return Intl.supportedValuesOf('currency')
    .map((code) => {
      const name = names.of(code)
      return { code, label: name && name !== code ? `${code} (${name})` : code }
    })
    .sort((a, b) => a.code.localeCompare(b.code))
}

const SLEEP_TARGET_MIN = 5 * 60
const SLEEP_TARGET_MAX = 11 * 60
const SLEEP_TARGET_STEP = 15

/** 5h to 11h in 15-minute steps, plus the current value if it falls between steps. */
export function sleepTargetOptions(current: number): Array<{ value: number; label: string }> {
  const values = new Set<number>([current])
  for (let m = SLEEP_TARGET_MIN; m <= SLEEP_TARGET_MAX; m += SLEEP_TARGET_STEP) values.add(m)
  return [...values].sort((a, b) => a - b).map((value) => ({ value, label: formatDuration(value) }))
}
