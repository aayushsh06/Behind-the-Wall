import { useState } from 'react'

import { exportsApi } from '@/api/exports'
import type { ExportFormat } from '@/api/exports'
import { shareOrDownload } from '@/lib/share'

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
      const result = await shareOrDownload(file, title, exportsApi.url(wallId, format, true))
      setStatus(result === 'cancelled' ? 'idle' : result)
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }

  const openPreview = () => window.open(exportsApi.url(wallId, 'html'), '_blank', 'noopener')

  return { status, error, share, openPreview }
}
