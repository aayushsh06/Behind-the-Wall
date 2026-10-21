import { SegmentedControl } from '@/components/ui'
import type { SegmentOption } from '@/components/ui'
import type { MarkerKind } from '@/domain/types'

const OPTIONS: readonly SegmentOption<MarkerKind>[] = [
  { value: 'point', label: 'Point' },
  { value: 'line', label: 'Line' },
]

interface PlacementModeToggleProps {
  value: MarkerKind
  onChange: (value: MarkerKind) => void
}

export function PlacementModeToggle({ value, onChange }: PlacementModeToggleProps) {
  return <SegmentedControl label="Add items as" options={OPTIONS} value={value} onChange={onChange} />
}
