import type { PixelImage } from '@/features/capture/snapPath'

/**
 * Decode a photo into RGBA pixels for snapping, at most `maxEdge` px on the long side.
 * Results are cached per URL, since a tradesperson usually draws several runs on one photo.
 * Photos come from the app's own API, so reading their pixels is allowed (same origin).
 */
const cache = new Map<string, Promise<PixelImage>>()

export function loadPixels(url: string, maxEdge = 900): Promise<PixelImage> {
  const cached = cache.get(url)
  if (cached) return cached
  const pending = (async () => {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas is not available')
    context.drawImage(image, 0, 0, width, height)
    const { data } = context.getImageData(0, 0, width, height)
    return { width, height, data }
  })()
  cache.set(url, pending)
  pending.catch(() => cache.delete(url))
  return pending
}
