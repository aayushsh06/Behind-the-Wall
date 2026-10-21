export type CaptureStep = 'photo' | 'dimensions' | 'details' | 'markers'

export const CAPTURE_STEPS: readonly { key: CaptureStep; label: string }[] = [
  { key: 'photo', label: 'Photo' },
  { key: 'dimensions', label: 'Size' },
  { key: 'details', label: 'Details' },
  { key: 'markers', label: 'Items' },
]
