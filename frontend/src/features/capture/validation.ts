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

/** Markers with no measurement are incomplete; the save button stays disabled until fixed. */
export function incompleteMarkerIds(draft: WallDraft): string[] {
  return draft.markers.filter((m) => !m.measurement.trim()).map((m) => m.id)
}
