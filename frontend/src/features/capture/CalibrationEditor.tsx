import type { CalibrationCorner, Point } from '@/components/photo'
import { PhotoCanvas } from '@/components/photo'
import type { WallCalibration } from '@/domain/types'
import type { DraftPhoto } from '@/features/capture/wallDraft'

interface CalibrationEditorProps {
  photo: DraftPhoto
  calibration: WallCalibration
  onMoveCorner: (corner: CalibrationCorner, point: Point) => void
}

/** Photo with two draggable corner handles that define where the wall is in the picture. */
export function CalibrationEditor({ photo, calibration, onMoveCorner }: CalibrationEditorProps) {
  return (
    <PhotoCanvas
      src={photo.url}
      alt="Wall"
      aspectRatio={photo.width / photo.height}
      markers={[]}
      calibration={calibration}
      calibrationEditable
      onMoveCalibrationCorner={onMoveCorner}
    />
  )
}
