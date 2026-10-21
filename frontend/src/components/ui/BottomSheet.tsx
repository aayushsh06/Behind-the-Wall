import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Mobile-style modal that slides up from the bottom. Closes on backdrop tap or Escape. */
export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-line bg-surface p-5 shadow-sheet"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  )
}
