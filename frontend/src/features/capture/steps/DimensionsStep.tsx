import { Button, InfoBox } from '@/components/ui'
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
        <InfoBox>Add a photo first to record the wall size.</InfoBox>
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
          <p className="text-sm leading-relaxed text-fg-muted">
            Drag the handles to the <strong className="text-fg">top-left</strong> and{' '}
            <strong className="text-fg">bottom-right</strong> corners of the wall, then enter its real size. The app
            will work out where each item is.
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
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button variant="ghost" onClick={() => dispatch({ type: 'setCalibration', calibration: null })}>
            Skip wall size
          </Button>
        </>
      ) : (
        <>
          <InfoBox>
            Mark the wall corners and enter its width and height so item positions are computed for you. Without this,
            you type each measurement by hand.
          </InfoBox>
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
