const decimalsCache = new Map<string, number>()

/** Number of minor-unit digits for an ISO 4217 currency (NPR → 2, JPY → 0). */
export function currencyDecimals(currency: string): number {
  let decimals = decimalsCache.get(currency)
  if (decimals === undefined) {
    decimals =
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    decimalsCache.set(currency, decimals)
  }
  return decimals
}

let supportedCurrencies: Set<string> | undefined

/** Whether `currency` is an ISO 4217 code this runtime knows (Intl accepts any 3 letters). */
export function isSupportedCurrency(currency: string): boolean {
  if (!/^[A-Z]{3}$/.test(currency)) return false
  supportedCurrencies ??= new Set(Intl.supportedValuesOf('currency'))
  return supportedCurrencies.has(currency)
}

/** Converts a major-unit amount (12.5) to integer minor units (1250). */
export function toMinor(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) throw new RangeError(`Invalid amount: ${amount}`)
  const scaled = amount * 10 ** currencyDecimals(currency)
  // toPrecision strips float noise so 1.005 → 100.5 rounds to 101, not 100.
  return Math.round(Number(scaled.toPrecision(15)))
}

export function fromMinor(minor: number, currency: string): number {
  return minor / 10 ** currencyDecimals(currency)
}

/**
 * Parses what a user typed into an amount field ("1,250.5") into minor units.
 * Returns null for empty, malformed, or over-precise input.
 */
export function parseMoneyInput(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s,]/g, '')
  const decimals = currencyDecimals(currency)
  const pattern = decimals > 0 ? new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`) : /^\d+$/
  if (cleaned === '' || cleaned === '.' || !pattern.test(cleaned)) return null
  return toMinor(Number(cleaned), currency)
}

export interface FormatMoneyOptions {
  /** 12.3K style, for chart axes and tight spaces. */
  compact?: boolean
  locale?: string
}

/** Formats minor units for display. Whole amounts drop their decimals. */
export function formatMoney(
  minor: number,
  currency: string,
  { compact = false, locale }: FormatMoneyOptions = {},
): string {
  const decimals = currencyDecimals(currency)
  const isWhole = minor % 10 ** decimals === 0
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact || isWhole ? 0 : decimals,
    maximumFractionDigits: compact ? 1 : decimals,
  }).format(fromMinor(minor, currency))
}
