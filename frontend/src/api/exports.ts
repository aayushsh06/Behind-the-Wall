import { apiUrl } from '@/api/client'

export type ExportFormat = 'html' | 'json'

export const exportsApi = {
  url: (wallId: string, format: ExportFormat, download = false) =>
    apiUrl(`/walls/${wallId}/export.${format}${download ? '?download=true' : ''}`),

  /** Fetch the export as a File so it can be handed to the Web Share API. */
  async fetchFile(wallId: string, format: ExportFormat): Promise<File> {
    const response = await fetch(exportsApi.url(wallId, format))
    if (!response.ok) throw new Error(`Export failed (${response.status})`)
    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition') ?? ''
    const match = /filename="([^"]+)"/.exec(disposition)
    const filename = match?.[1] ?? `wall.${format}`
    return new File([blob], filename, { type: blob.type })
  },
}
