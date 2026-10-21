export type CaptureStep = 'photo' | 'details' | 'markers'

export const CAPTURE_STEPS: readonly { key: CaptureStep; label: string }[] = [
  { key: 'photo', label: 'Photo' },
  { key: 'details', label: 'Details' },
  { key: 'markers', label: 'Items' },
]
