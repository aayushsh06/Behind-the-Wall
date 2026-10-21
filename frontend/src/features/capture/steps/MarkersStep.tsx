import { PhotoCanvas } from '@/components/photo'
import { BottomSheet, Button, ErrorMessage, TextField } from '@/components/ui'
import { MarkerForm } from '@/features/capture/MarkerForm'
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
  const selected = draft.markers.find((m) => m.id === draft.selectedMarkerId) ?? null
  const incomplete = incompleteMarkerIds(draft)
  const canPlace = draft.photo !== null && draft.coverage !== 'none'

  return (
    <div className="flex flex-col gap-4">
      {canPlace && draft.photo ? (
        <>
          <p className="text-sm text-stone-600">Tap the photo where each pipe, wire, or stud is. Drag a pin to adjust.</p>
          <PhotoCanvas
            src={draft.photo.url}
            alt="Wall"
            aspectRatio={draft.photo.width / draft.photo.height}
            markers={draft.markers}
            uncoveredRegion={draft.uncoveredRegion}
            selectedMarkerId={draft.selectedMarkerId}
            editable
            onPlace={(point) => dispatch({ type: 'addMarker', point })}
            onSelectMarker={(id) => dispatch({ type: 'selectMarker', id })}
            onMoveMarker={(id, point) => dispatch({ type: 'moveMarker', id, point })}
          />
          <MarkerList
            markers={draft.markers}
            selectedId={draft.selectedMarkerId}
            onSelect={(id) => dispatch({ type: 'selectMarker', id })}
          />
        </>
      ) : (
        <p className="rounded-xl bg-stone-100 p-4 text-sm text-stone-600">
          This wall is recorded as not inspected, so there are no items to mark.
        </p>
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
        <p className="text-center text-xs text-amber-700">Add a measurement to every item before saving.</p>
      ) : null}

      <BottomSheet
        open={selected !== null}
        title={selected ? `Item ${draft.markers.indexOf(selected) + 1}` : ''}
        onClose={() => dispatch({ type: 'selectMarker', id: null })}
      >
        {selected ? (
          <MarkerForm
            marker={selected}
            onChange={(changes) => dispatch({ type: 'updateMarker', id: selected.id, changes })}
            onDelete={() => dispatch({ type: 'removeMarker', id: selected.id })}
            onDone={() => dispatch({ type: 'selectMarker', id: null })}
          />
        ) : null}
      </BottomSheet>
    </div>
  )
}
