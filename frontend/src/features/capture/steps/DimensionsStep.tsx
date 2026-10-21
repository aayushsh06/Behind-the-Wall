import { Button } from '@/components/ui'
import { CalibrationEditor } from '@/features/capture/CalibrationEditor'
import { calibrationErrors } from '@/features/capture/validation'
import { WallSizeFields } from '@/features/capture/WallSizeFields'
import type { DraftAction, WallDraft } from '@/features/capture/wallDraft'
import { DEFAULT_CALIBRATION } from '@/features/capture/wallDraft'

interface DimensionsStepProps {
  draft: WallDraft
  dispatch: React.Dispatch<DraftAction>
  onBack: () => void
  onNext: () => void
}

/**
 * Optional calibration: drag the two corner handles onto the wall's top-left and
 * bottom-right corners, then enter the real size. Positions of every item are then
 * computed automatically.
 */
export function DimensionsStep({ draft, dispatch, onBack, onNext }: DimensionsStepProps) {
  const photo = draft.photo
  const calibration = draft.calibration
  const error = calibrationErrors(draft)

  if (!photo) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl bg-stone-100 p-4 text-sm text-stone-600">Add a photo first to record the wall size.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack}>Back</Button>
          <Button size="lg" fullWidth onClick={onNext}>Next: details</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {calibration ? (
        <>
          <p className="text-sm text-stone-600">
            Drag the handles to the <strong>top-left</strong> and <strong>bottom-right</strong> corners of the wall,
            then enter its real size. The app will work out where each item is.
          </p>
          <CalibrationEditor
            photo={photo}
            calibration={calibration}
            onMoveCorner={(corner, point) => dispatch({ type: 'moveCalibrationCorner', corner, point })}
          />
          <WallSizeFields
            calibration={calibration}
            onChange={(changes) => dispatch({ type: 'setCalibrationSize', changes })}
          />
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button variant="ghost" onClick={() => dispatch({ type: 'setCalibration', calibration: null })}>
            Skip wall size
          </Button>
        </>
      ) : (
        <>
          <p className="rounded-xl bg-stone-100 p-4 text-sm text-stone-600">
            Mark the wall corners and enter its width and height so item positions are computed for you. Without this,
            you type each measurement by hand.
          </p>
          <Button
            size="lg"
            fullWidth
            onClick={() => dispatch({ type: 'setCalibration', calibration: DEFAULT_CALIBRATION })}
          >
            Set wall size
          </Button>
        </>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button size="lg" fullWidth onClick={onNext} disabled={Boolean(error)}>
          Next: details
        </Button>
      </div>
    </div>
  )
}
