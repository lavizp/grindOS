import { isIos } from '@/lib/platform'

const nav = (userAgent: string, platform = '', maxTouchPoints = 0) =>
  ({ userAgent, platform, maxTouchPoints }) as Navigator

describe('isIos', () => {
  it('recognizes iPhone and iPad, including iPadOS posing as a Mac', () => {
    expect(isIos(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'))).toBe(true)
    expect(isIos(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5))).toBe(true)
  })

  it('leaves out Macs and Android', () => {
    expect(isIos(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0))).toBe(false)
    expect(isIos(nav('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 'Linux armv8l', 5))).toBe(false)
  })
})
