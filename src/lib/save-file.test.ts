import { saveFile } from '@/lib/save-file'

const file = new File(['{}'], 'backup.json', { type: 'application/json' })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
})

function stubShare(share: () => Promise<void>) {
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
  Object.defineProperty(navigator, 'share', { value: vi.fn(share), configurable: true })
}

function stubDownload() {
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
  return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
}

describe('saveFile', () => {
  it('opens the share sheet where files can be shared', async () => {
    stubShare(async () => {})
    expect(await saveFile(file)).toBe('shared')
    expect(navigator.share).toHaveBeenCalledWith({ files: [file], title: 'backup.json' })
  })

  it('reports a closed share sheet as cancelled', async () => {
    stubShare(async () => {
      throw new DOMException('Share canceled', 'AbortError')
    })
    expect(await saveFile(file)).toBe('cancelled')
  })

  it('downloads when sharing fails or isn’t available', async () => {
    const click = stubDownload()
    expect(await saveFile(file)).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()

    stubShare(async () => {
      throw new DOMException('Not allowed', 'NotAllowedError')
    })
    expect(await saveFile(file)).toBe('downloaded')
    expect(click).toHaveBeenCalledTimes(2)
  })
})
