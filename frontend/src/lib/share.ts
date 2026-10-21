/** Thin wrappers around the Web Share API with a download fallback. */

export function canShareFiles(files: File[]): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files })
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
