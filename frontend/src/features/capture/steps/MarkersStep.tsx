import { useState } from 'react'

import type { Point } from '@/components/photo'
import { PhotoCanvas, ZoomViewport } from '@/components/photo'
import { BottomSheet, Button, ErrorMessage, InfoBox, TextField } from '@/components/ui'
import { isCalibrationValid, markerPosition } from '@/domain/geometry'
import type { UtilityType } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'
import { MarkerForm } from '@/features/capture/MarkerForm'
import type { Bounds } from '@/components/photo/bounds'
import { clampToBounds, FULL_PHOTO } from '@/components/photo/bounds'
import type { MarkerTool } from '@/features/capture/MarkerToolbar'
import { MarkerToolbar } from '@/features/capture/MarkerToolbar'
import { smoothStroke, snapStroke } from '@/features/capture/snapPath'
import { incompleteMarkerIds } from '@/features/capture/validation'
import type { DraftAction, WallDraft } from '@/features/capture/wallDraft'
import { MarkerList } from '@/features/find/MarkerList'
import { loadPixels } from '@/lib/imagePixels'

interface MarkersStepProps {
  draft: WallDraft
  dispatch: React.Dispatch<DraftAction>
  submitting: boolean
  submitError: unknown
  submitLabel: string
  onBack: () => void
  onSubmit: () => void
}

type DrawStatus = { state: 'snapping' } | { state: 'snapped' | 'kept' | 'line'; label: string } | null

/** Smooth a stroke given in normalized coordinates (smoothing works in pixel units). */
function smoothNormalized(points: Point[]): Point[] {
  const SCALE = 1000
  return smoothStroke(points.map((p) => ({ x: p.x * SCALE, y: p.y * SCALE }))).map((p) => ({
    x: p.x / SCALE,
    y: p.y / SCALE,
  }))
}

export function MarkersStep({ draft, dispatch, submitting, submitError, submitLabel, onBack, onSubmit }: MarkersStepProps) {
  const [utility, setUtility] = useState<UtilityType>('wire')
  const [tool, setTool] = useState<MarkerTool>('scroll')
  const [snap, setSnap] = useState(true)
  const [status, setStatus] = useState<DrawStatus>(null)

  const photo = draft.photo
  const selected = draft.markers.find((m) => m.id === draft.selectedMarkerId) ?? null
  const incomplete = incompleteMarkerIds(draft)
  const canPlace = draft.photo !== null && draft.coverage !== 'none'
  const calibration = isCalibrationValid(draft.calibration) ? draft.calibration : null
  const label = UTILITY_META[utility].label.toLowerCase()
  // Runs and points stay inside the wall frame marked on the dimensions step.
  const bounds: Bounds = calibration
    ? { x0: calibration.top_left.x, y0: calibration.top_left.y, x1: calibration.bottom_right.x, y1: calibration.bottom_right.y }
    : FULL_PHOTO
  const lastMarker = draft.markers[draft.markers.length - 1]

  /**
   * Snap a finished stroke to the photo (or just smooth it) and add it as a run.
   * Zoomed in, the photo is analysed at full resolution so closely spaced cables stay
   * distinct. The corridor stays the same share of the photo: zooming already makes the
   * trace more precise, and a narrower corridor measured worse on real photos.
   */
  const handleDrawComplete = async (stroke: Point[], zoom: number) => {
    const photo = draft.photo
    if (!photo) return
    const runLabel = label
    let points = smoothNormalized(stroke)
    let outcome: 'snapped' | 'kept' = 'kept'
    if (snap) {
      setStatus({ state: 'snapping' })
      try {
        const image = await loadPixels(photo.url, zoom > 1.25 ? 1600 : 900)
        const corridor = Math.max(10, Math.round(0.035 * Math.max(image.width, image.height)))
        const result = snapStroke(
          image,
          stroke.map((p) => ({ x: p.x * image.width, y: p.y * image.height })),
          { corridor },
        )
        points = result.points.map((p) => clampToBounds({ x: p.x / image.width, y: p.y / image.height }, bounds))
        outcome = result.snapped ? 'snapped' : 'kept'
      } catch {
        outcome = 'kept'
      }
    }
    dispatch({ type: 'addPathMarker', points, utility })
    setStatus({ state: outcome, label: runLabel })
  }

  const instructions =
    tool === 'scroll'
      ? 'Scroll the page and pinch to zoom without marking anything. Choose Freehand to trace a run that bends, or Straight for a straight one. Marks stay inside the wall frame.'
      : tool === 'draw'
        ? `Trace the ${label} with your finger inside the wall frame; swipe outside it to scroll.${snap ? ` When you lift, it snaps to the ${label} in the photo.` : ''} Pinch with two fingers to zoom in where cables run close together.`
        : `Put your finger where the ${label} starts inside the wall frame, drag to where it ends, and lift. Nearly level or plumb lines are squared up. Swipe outside the frame to scroll.`

  const handleLineComplete = (stroke: Point[]) => {
    const start = stroke[0]
    const end = stroke[stroke.length - 1]
    if (!start || !end) return
    dispatch({ type: 'addLineMarker', start, end, utility })
    setStatus({ state: 'line', label })
  }

  return (
    <div className="flex flex-col gap-4">
      {canPlace && photo ? (
        <>
          <MarkerToolbar
            utility={utility}
            onUtilityChange={setUtility}
            tool={tool}
            onToolChange={(next) => {
              setTool(next)
              setStatus(null)
            }}
            snap={snap}
            onSnapChange={setSnap}
          />
          <p className="text-sm leading-relaxed text-fg-muted">{instructions}</p>
          <ZoomViewport drawing={tool !== 'scroll'}>
            {({ zoom, pinching }) => (
              <PhotoCanvas
                src={photo.url}
                alt="Wall"
                aspectRatio={photo.width / photo.height}
                markers={draft.markers}
                uncoveredRegion={draft.uncoveredRegion}
                calibration={calibration}
                selectedMarkerId={draft.selectedMarkerId}
                editable
                gestureActive={pinching}
                drawColor={tool === 'scroll' ? null : UTILITY_META[utility].hex}
                straight={tool === 'line'}
                drawBounds={bounds}
                pinsDraggable={tool !== 'scroll'}
                dimOutsideFrame={tool !== 'scroll'}
                onDrawComplete={(stroke) =>
                  tool === 'line' ? handleLineComplete(stroke) : void handleDrawComplete(stroke, zoom)
                }
                onSelectMarker={(id) => dispatch({ type: 'selectMarker', id })}
                onMoveMarker={(id, point) => dispatch({ type: 'moveMarker', id, point: clampToBounds(point, bounds) })}
                onTranslateMarker={(id, dx, dy) => dispatch({ type: 'translateMarker', id, dx, dy })}
                onMoveMarkerEndpoint={(id, endpoint, point) =>
                  dispatch({ type: 'moveMarkerEndpoint', id, endpoint, point: clampToBounds(point, bounds) })
                }
              />
            )}
          </ZoomViewport>
          {status ? (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm"
            >
              <span>
                {status.state === 'snapping'
                  ? 'Snapping to the photo…'
                  : status.state === 'line'
                    ? `Straight ${status.label} added. Tap its number to add details or adjust its ends.`
                  : status.state === 'snapped'
                    ? `Snapped to the ${status.label} in the photo. Tap its number to add details.`
                    : `Kept as drawn${snap ? ' (nothing clear to snap to)' : ''}. Tap its number to add details.`}
              </span>
              {status.state !== 'snapping' && (lastMarker?.kind === 'path' || lastMarker?.kind === 'line') ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    dispatch({ type: 'removeMarker', id: lastMarker.id })
                    setStatus(null)
                  }}
                >
                  Undo
                </Button>
              ) : null}
            </div>
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
        <Button size="lg" variant="brand" fullWidth loading={submitting} disabled={incomplete.length > 0} onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
      {incomplete.length > 0 ? (
        <p className="text-center text-sm text-amber-800">Add a measurement to every item before saving.</p>
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
