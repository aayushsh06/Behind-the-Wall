/** Thin wrappers around the Web Share API with a download fallback. */

export function canShareFiles(files: File[]): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files })
    )
  } catch {
    return false
  }
}

export async function shareFiles(files: File[], title: string): Promise<'shared' | 'cancelled'> {
  try {
    await navigator.share({ files, title })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}

export type ShareResult = 'shared' | 'cancelled' | 'downloaded'

/** Native sharing can be rejected even after a positive capability check. */
export async function shareOrDownload(file: File, title: string, url: string): Promise<ShareResult> {
  if (canShareFiles([file])) {
    try {
      return await shareFiles([file], title)
    } catch {
      // Permission, activation, or platform failures can still fall back to a download.
    }
  }
  downloadUrl(url, file.name)
  return 'downloaded'
}

/** Trigger a browser download by navigating a hidden anchor to the URL. */
export function downloadUrl(url: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
