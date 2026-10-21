import { BottomSheet, Button, ErrorMessage } from '@/components/ui'
import { useShareWall } from '@/features/handoff/useShareWall'

interface ShareSheetProps {
  open: boolean
  wallId: string
  title: string
  onClose: () => void
}

/** Handoff: produce a record of exactly this one wall and send it on (R5). */
export function ShareSheet({ open, wallId, title, onClose }: ShareSheetProps) {
  const { status, error, share, openPreview } = useShareWall(wallId, title)
  const working = status === 'working'

  return (
    <BottomSheet open={open} title="Share this wall" onClose={onClose}>
      <p className="mb-4 text-sm text-stone-600">
        The file contains only <strong>{title}</strong>: its photo, items, author, and date. Nothing else from your
        home is included.
      </p>
      <div className="flex flex-col gap-2">
        <Button size="lg" fullWidth loading={working} onClick={() => void share('html')}>
          Share readable record
        </Button>
        <Button variant="secondary" fullWidth disabled={working} onClick={openPreview}>
          Preview record
        </Button>
        <Button variant="ghost" fullWidth disabled={working} onClick={() => void share('json')}>
          Share data file (for re-import)
        </Button>
      </div>
      {status === 'shared' ? <p className="mt-3 text-center text-sm text-green-700">Shared.</p> : null}
      {status === 'downloaded' ? (
        <p className="mt-3 text-center text-sm text-green-700">Downloaded. Send the file to whoever needs it.</p>
      ) : null}
      {status === 'error' ? <div className="mt-3"><ErrorMessage error={error} /></div> : null}
    </BottomSheet>
  )
}
