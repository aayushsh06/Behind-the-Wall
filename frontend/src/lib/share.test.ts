import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { shareOrDownload } from '@/lib/share'

const title = 'Kitchen · Wall behind stove'

describe.each([
  { format: 'html', type: 'text/html' },
  { format: 'json', type: 'application/json' },
])('$format export handoff', ({ format, type }) => {
  const file = new File(['wall record'], `wall.${format}`, { type })
  const url = `/api/walls/wall-id/export.${format}?download=true`
  const anchor = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() }
  const canShare = vi.fn()
  const share = vi.fn()
  const appendChild = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    canShare.mockReset().mockReturnValue(true)
    share.mockReset().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare, share })
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(anchor),
      body: { appendChild },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  function expectDownload() {
    expect(anchor.href).toBe(url)
    expect(anchor.download).toBe(file.name)
    expect(appendChild).toHaveBeenCalledWith(anchor)
    expect(anchor.click).toHaveBeenCalledExactlyOnceWith()
    expect(anchor.remove).toHaveBeenCalledExactlyOnceWith()
  }

  it('uses native sharing when it succeeds', async () => {
    await expect(shareOrDownload(file, title, url)).resolves.toBe('shared')
    expect(canShare).toHaveBeenCalledWith({ files: [file] })
    expect(share).toHaveBeenCalledWith({ files: [file], title })
    expect(anchor.click).not.toHaveBeenCalled()
  })

  it('does not download when the user cancels', async () => {
    share.mockRejectedValue(new DOMException('Share cancelled', 'AbortError'))
    await expect(shareOrDownload(file, title, url)).resolves.toBe('cancelled')
    expect(anchor.click).not.toHaveBeenCalled()
  })

  it.each(['NotAllowedError', 'SecurityError', 'DataError'])(
    'downloads after native sharing rejects with %s despite a positive capability check',
    async (name) => {
      share.mockRejectedValue(new DOMException('Permission denied', name))
      await expect(shareOrDownload(file, title, url)).resolves.toBe('downloaded')
      expect(share).toHaveBeenCalledWith({ files: [file], title })
      expectDownload()
    },
  )

  it('downloads when the platform rejects the file type', async () => {
    share.mockRejectedValue(new TypeError('Unsupported file type'))
    await expect(shareOrDownload(file, title, url)).resolves.toBe('downloaded')
    expectDownload()
  })

  it('downloads when the file cannot be shared', async () => {
    canShare.mockReturnValue(false)
    await expect(shareOrDownload(file, title, url)).resolves.toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expectDownload()
  })

  it('downloads when the capability check throws', async () => {
    canShare.mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError') })
    await expect(shareOrDownload(file, title, url)).resolves.toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expectDownload()
  })

  it.each([{}, { canShare }, { share }])('downloads when native sharing is unavailable (%j)', async (navigator) => {
    vi.stubGlobal('navigator', navigator)
    await expect(shareOrDownload(file, title, url)).resolves.toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expectDownload()
  })

  it('keeps download failures visible to the caller', async () => {
    canShare.mockReturnValue(false)
    anchor.click.mockImplementationOnce(() => { throw new Error('Download failed') })
    await expect(shareOrDownload(file, title, url)).rejects.toThrow('Download failed')
  })
})
