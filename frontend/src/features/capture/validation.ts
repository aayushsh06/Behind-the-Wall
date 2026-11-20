import { isCalibrationValid } from '@/domain/geometry'
import type { HomeownerStatus } from '@/domain/types'
import type { WallDraft } from '@/features/capture/wallDraft'

export type DetailsErrors = Partial<Record<'room' | 'label' | 'author' | 'observedDate' | 'homeownerEmail', string>>

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * `homeownerStatus` is passed when a tradesperson is creating a wall: what the server
 * said about the email entered (undefined while it hasn't been checked yet).
 */
export function validateDetails(draft: WallDraft, homeownerStatus?: HomeownerStatus | 'unchecked'): DetailsErrors {
  const errors: DetailsErrors = {}
  if (homeownerStatus !== undefined) {
    if (!EMAIL_PATTERN.test(draft.homeownerEmail.trim())) {
      errors.homeownerEmail = "Enter the homeowner's email address"
    } else if (homeownerStatus === 'not_a_homeowner') {
      errors.homeownerEmail = 'That email belongs to a tradesperson account, not a homeowner'
    } else if (homeownerStatus === 'not_registered' && !draft.inviteHomeowner) {
      errors.homeownerEmail = 'No one has signed up with this email. Tick the box to invite them, or check the spelling'
    } else if (homeownerStatus === 'unchecked') {
      errors.homeownerEmail = 'Checking this email. Try again in a moment'
    }
  }
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
