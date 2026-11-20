import { BottomSheet, Button, ErrorMessage } from '@/components/ui'
import { useShareWall } from '@/features/handoff/useShareWall'

interface ShareSheetProps {
  open: boolean
  wallId: string
  title: string
  onClose: () => void
}

/** Handoff: send the PDF of exactly this one wall (R5). */
export function ShareSheet({ open, wallId, title, onClose }: ShareSheetProps) {
  const { status, error, share, openPreview } = useShareWall(wallId, title)
  const working = status === 'working'

  return (
    <BottomSheet open={open} title="Share this wall" onClose={onClose}>
      <p className="mb-5 text-sm leading-relaxed text-fg-muted">
        The PDF contains only <strong className="text-fg">{title}</strong>: its annotated photo, items, who recorded
        it, and when. Nothing else from the home is included.
      </p>
      <div className="flex flex-col gap-2">
        <Button size="lg" fullWidth loading={working} onClick={() => void share('pdf')}>
          Share PDF
        </Button>
        <Button variant="secondary" fullWidth disabled={working} onClick={openPreview}>
          Open PDF
        </Button>
        <Button variant="ghost" fullWidth disabled={working} onClick={() => void share('json')}>
          Share data file (JSON)
        </Button>
      </div>
      {status === 'shared' ? <p className="mt-3 text-center text-sm text-green-700">Shared.</p> : null}
      {status === 'downloaded' ? (
        <p className="mt-3 text-center text-sm text-green-700">Downloaded. Send the file to whoever needs it.</p>
      ) : null}
      {status === 'error' ? (
        <div className="mt-3">
          <ErrorMessage error={error} />
        </div>
      ) : null}
    </BottomSheet>
  )
}
