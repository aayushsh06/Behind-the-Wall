import { SegmentedControl } from '@/components/ui'
import type { SegmentOption } from '@/components/ui'
import type { Coverage } from '@/domain/types'

const OPTIONS: readonly SegmentOption<Coverage>[] = [
  { value: 'full', label: 'Whole wall' },
  { value: 'partial', label: 'Part of it' },
  { value: 'none', label: 'Not opened' },
]

interface CoverageSelectorProps {
  value: Coverage
  onChange: (value: Coverage) => void
  hasPhoto: boolean
}

export function CoverageSelector({ value, onChange, hasPhoto }: CoverageSelectorProps) {
  const options = hasPhoto ? OPTIONS : OPTIONS.filter((o) => o.value === 'none')
  return (
    <div>
      <SegmentedControl label="How much of the wall was visible?" options={options} value={value} onChange={onChange} />
      {!hasPhoto ? (
        <p className="mt-1 text-xs text-stone-500">Add a photo to record full or partial coverage.</p>
      ) : null}
    </div>
  )
}
