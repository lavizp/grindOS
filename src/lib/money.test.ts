import {
  currencyDecimals,
  formatMoney,
  fromMinor,
  isSupportedCurrency,
  parseMoneyInput,
  toMinor,
} from '@/lib/money'

// Intl uses non-breaking spaces between the currency code and the number.
const plain = (s: string) => s.replace(/ /g, ' ')

describe('currencyDecimals', () => {
  it('reads minor-unit digits from Intl', () => {
    expect(currencyDecimals('NPR')).toBe(2)
    expect(currencyDecimals('USD')).toBe(2)
    expect(currencyDecimals('JPY')).toBe(0)
  })

  it('validates currency codes', () => {
    expect(isSupportedCurrency('NPR')).toBe(true)
    expect(isSupportedCurrency('npr')).toBe(false)
    expect(isSupportedCurrency('XX')).toBe(false)
  })
})

describe('toMinor / fromMinor', () => {
  it('converts to integer minor units', () => {
    expect(toMinor(12.5, 'NPR')).toBe(1250)
    expect(toMinor(1234, 'JPY')).toBe(1234)
  })

  it('rounds away floating point noise', () => {
    expect(toMinor(1.005, 'NPR')).toBe(101)
    expect(toMinor(0.1 + 0.2, 'NPR')).toBe(30)
    expect(toMinor(19.99, 'NPR')).toBe(1999)
    expect(toMinor(4.35, 'USD')).toBe(435)
  })

  it('rejects non-finite amounts', () => {
    expect(() => toMinor(NaN, 'NPR')).toThrow(RangeError)
    expect(() => toMinor(Infinity, 'NPR')).toThrow(RangeError)
  })

  it('converts back to major units', () => {
    expect(fromMinor(1250, 'NPR')).toBe(12.5)
    expect(fromMinor(1234, 'JPY')).toBe(1234)
  })
})

describe('parseMoneyInput', () => {
  it('parses typed amounts', () => {
    expect(parseMoneyInput('250', 'NPR')).toBe(25000)
    expect(parseMoneyInput('1,250.5', 'NPR')).toBe(125050)
    expect(parseMoneyInput(' 99.99 ', 'NPR')).toBe(9999)
    expect(parseMoneyInput('.5', 'NPR')).toBe(50)
    expect(parseMoneyInput('12.', 'NPR')).toBe(1200)
  })

  it('rejects invalid or over-precise input', () => {
    for (const bad of ['', '.', 'abc', '1.234', '-5', '1e3', '1.2.3']) {
      expect(parseMoneyInput(bad, 'NPR')).toBeNull()
    }
    expect(parseMoneyInput('12.5', 'JPY')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('drops decimals for whole amounts', () => {
    expect(plain(formatMoney(123400, 'NPR', { locale: 'en-US' }))).toBe('NPR 1,234')
  })

  it('shows full decimals for fractional amounts', () => {
    expect(plain(formatMoney(123450, 'NPR', { locale: 'en-US' }))).toBe('NPR 1,234.50')
    expect(formatMoney(1999, 'USD', { locale: 'en-US' })).toBe('$19.99')
  })

  it('supports compact notation', () => {
    expect(plain(formatMoney(4_500_000, 'NPR', { locale: 'en-US', compact: true }))).toBe('NPR 45K')
  })

  it('formats zero-decimal currencies', () => {
    expect(formatMoney(1234, 'JPY', { locale: 'en-US' })).toBe('¥1,234')
  })
})
