import { useState } from 'react'

import type { Point } from '@/components/photo'
import { PhotoCanvas } from '@/components/photo'
import { BottomSheet, Button, ErrorMessage, InfoBox, TextField } from '@/components/ui'
import { isCalibrationValid, markerPosition } from '@/domain/geometry'
import type { MarkerKind } from '@/domain/types'
import { MarkerForm } from '@/features/capture/MarkerForm'
import { PlacementModeToggle } from '@/features/capture/PlacementModeToggle'
import { incompleteMarkerIds } from '@/features/capture/validation'
import type { DraftAction, WallDraft } from '@/features/capture/wallDraft'
import { MarkerList } from '@/features/find/MarkerList'

interface MarkersStepProps {
  draft: WallDraft
  dispatch: React.Dispatch<DraftAction>
  submitting: boolean
  submitError: unknown
  submitLabel: string
  onBack: () => void
  onSubmit: () => void
}

export function MarkersStep({ draft, dispatch, submitting, submitError, submitLabel, onBack, onSubmit }: MarkersStepProps) {
  const [mode, setMode] = useState<MarkerKind>('point')
  const [pendingStart, setPendingStart] = useState<Point | null>(null)

  const selected = draft.markers.find((m) => m.id === draft.selectedMarkerId) ?? null
  const incomplete = incompleteMarkerIds(draft)
  const canPlace = draft.photo !== null && draft.coverage !== 'none'
  const calibration = isCalibrationValid(draft.calibration) ? draft.calibration : null

  const handlePlace = (point: Point) => {
    if (mode === 'point') {
      dispatch({ type: 'addMarker', point })
      return
    }
    if (!pendingStart) {
      setPendingStart(point)
      return
    }
    dispatch({ type: 'addLineMarker', start: pendingStart, end: point })
    setPendingStart(null)
  }

  const changeMode = (next: MarkerKind) => {
    setMode(next)
    setPendingStart(null)
  }

  const instructions =
    mode === 'line'
      ? pendingStart
        ? 'Now tap where the run ends.'
        : 'Tap where the run starts, then where it ends. Drag the badge to move it or the ends to adjust.'
      : 'Tap the photo where each item is. Drag a pin to adjust.'

  return (
    <div className="flex flex-col gap-4">
      {canPlace && draft.photo ? (
        <>
          <PlacementModeToggle value={mode} onChange={changeMode} />
          <p className="text-sm leading-relaxed text-fg-muted">{instructions}</p>
          <PhotoCanvas
            src={draft.photo.url}
            alt="Wall"
            aspectRatio={draft.photo.width / draft.photo.height}
            markers={draft.markers}
            uncoveredRegion={draft.uncoveredRegion}
            calibration={calibration}
            selectedMarkerId={draft.selectedMarkerId}
            pendingLineStart={pendingStart}
            editable
            onPlace={handlePlace}
            onSelectMarker={(id) => dispatch({ type: 'selectMarker', id })}
            onMoveMarker={(id, point) => dispatch({ type: 'moveMarker', id, point })}
            onTranslateMarker={(id, dx, dy) => dispatch({ type: 'translateMarker', id, dx, dy })}
            onMoveMarkerEndpoint={(id, endpoint, point) => dispatch({ type: 'moveMarkerEndpoint', id, endpoint, point })}
          />
          {pendingStart ? (
            <Button variant="ghost" onClick={() => setPendingStart(null)}>
              Cancel this line
            </Button>
          ) : null}
          <MarkerList
            markers={draft.markers}
            calibration={calibration}
            selectedId={draft.selectedMarkerId}
            onSelect={(id) => dispatch({ type: 'selectMarker', id })}
          />
        </>
      ) : (
        <InfoBox>This wall is recorded as not inspected, so there are no items to mark.</InfoBox>
      )}

      <TextField
        multiline
        label="Wall notes (optional)"
        placeholder="Why the wall was opened, anything a future person should know."
        value={draft.notes}
        onChange={(event) => dispatch({ type: 'setField', field: 'notes', value: event.target.value })}
      />

      {submitError ? <ErrorMessage error={submitError} /> : null}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button size="lg" fullWidth loading={submitting} disabled={incomplete.length > 0} onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
      {incomplete.length > 0 ? (
        <p className="text-center text-xs text-amber-300">Add a measurement to every item before saving.</p>
      ) : null}

      <BottomSheet
        open={selected !== null}
        title={selected ? `Item ${draft.markers.indexOf(selected) + 1}` : ''}
        onClose={() => dispatch({ type: 'selectMarker', id: null })}
      >
        {selected ? (
          <MarkerForm
            marker={selected}
            position={markerPosition(selected, calibration)}
            onChange={(changes) => dispatch({ type: 'updateMarker', id: selected.id, changes })}
            onDelete={() => dispatch({ type: 'removeMarker', id: selected.id })}
            onDone={() => dispatch({ type: 'selectMarker', id: null })}
          />
        ) : null}
      </BottomSheet>
    </div>
  )
}
