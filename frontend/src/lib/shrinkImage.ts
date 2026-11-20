/**
 * Shrink a photo in the browser before uploading it.
 *
 * Phone cameras produce 5–12 MB images; the server keeps at most 1600 px on the long
 * edge, and the hosting platform rejects request bodies over 4.5 MB. Downscaling here
 * keeps uploads small and fast on mobile data. Orientation from EXIF is applied, so the
 * result is upright. If the browser can't decode the file, the original is returned and
 * the server does the work (or reports that it isn't an image).
 */
const MAX_EDGE = 2000
const QUALITY = 0.86
const SMALL_ENOUGH = 1.5 * 1024 * 1024

export async function shrinkImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= SMALL_ENOUGH) return file
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    return blob && blob.size < file.size ? blob : file
  } finally {
    bitmap.close()
  }
}
