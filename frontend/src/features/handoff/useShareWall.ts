import { useState } from 'react'

import { exportsApi } from '@/api/exports'
import type { ExportFormat } from '@/api/exports'
import { canShareFiles, downloadUrl, shareFiles } from '@/lib/share'

export type ShareStatus = 'idle' | 'working' | 'shared' | 'downloaded' | 'error'

/** Shares the single-wall export via the OS share sheet when possible, otherwise downloads it. */
export function useShareWall(wallId: string, title: string) {
  const [status, setStatus] = useState<ShareStatus>('idle')
  const [error, setError] = useState<unknown>(null)

  const share = async (format: ExportFormat) => {
    setStatus('working')
    setError(null)
    try {
      const file = await exportsApi.fetchFile(wallId, format)
      if (canShareFiles([file])) {
        const result = await shareFiles([file], title)
        setStatus(result === 'shared' ? 'shared' : 'idle')
        return
      }
      downloadUrl(exportsApi.url(wallId, format, true), file.name)
      setStatus('downloaded')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }

  const openPreview = () => window.open(exportsApi.url(wallId, 'html'), '_blank', 'noopener')

  return { status, error, share, openPreview }
}
