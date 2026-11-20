import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Modal dialog: slides up from the bottom on phones, centered on larger screens.
 * Closes on backdrop click or Escape.
 */
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-surface p-5 shadow-sheet sm:rounded-lg sm:p-6"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 -mt-1 flex size-8 items-center justify-center rounded-md text-fg-faint hover:bg-surface-2 hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
