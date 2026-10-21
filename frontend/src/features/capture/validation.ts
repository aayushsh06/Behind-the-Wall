import { isCalibrationValid } from '@/domain/geometry'
import type { WallDraft } from '@/features/capture/wallDraft'

export type DetailsErrors = Partial<Record<'room' | 'label' | 'author' | 'observedDate', string>>

export function validateDetails(draft: WallDraft): DetailsErrors {
  const errors: DetailsErrors = {}
  if (!draft.room.trim()) errors.room = 'Room is required'
  if (!draft.label.trim()) errors.label = 'Wall label is required'
  if (!draft.author.trim()) errors.author = 'Author is required'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.observedDate)) errors.observedDate = 'Enter a date'
  return errors
}

/**
 * A marker needs a manual measurement unless the wall is calibrated, in which case the
 * app computes its position. The save button stays disabled until every marker is complete.
 */
export function incompleteMarkerIds(draft: WallDraft): string[] {
  if (isCalibrationValid(draft.calibration)) return []
  return draft.markers.filter((m) => !m.measurement.trim()).map((m) => m.id)
}

export function calibrationErrors(draft: WallDraft): string | null {
  const c = draft.calibration
  if (!c) return null
  if (!(c.width > 0) || !(c.height > 0)) return 'Enter the wall width and height.'
  if (!isCalibrationValid(c)) return 'Drag the corners so the top-left is above and left of the bottom-right.'
  return null
}
