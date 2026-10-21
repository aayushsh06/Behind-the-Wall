import { SegmentedControl, TextField } from '@/components/ui'
import type { SegmentOption } from '@/components/ui'
import type { LengthUnit, WallCalibration } from '@/domain/types'

const UNIT_OPTIONS: readonly SegmentOption<LengthUnit>[] = [
  { value: 'in', label: 'Inches' },
  { value: 'cm', label: 'Centimeters' },
]

interface WallSizeFieldsProps {
  calibration: WallCalibration
  onChange: (changes: Partial<Pick<WallCalibration, 'width' | 'height'>> & { unit?: LengthUnit }) => void
}

const parse = (value: string) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function WallSizeFields({ calibration, onChange }: WallSizeFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl label="Units" options={UNIT_OPTIONS} value={calibration.unit} onChange={(unit) => onChange({ unit })} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={`Wall width (${calibration.unit})`}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={calibration.width || ''}
          onChange={(event) => onChange({ width: parse(event.target.value) })}
        />
        <TextField
          label={`Wall height (${calibration.unit})`}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={calibration.height || ''}
          onChange={(event) => onChange({ height: parse(event.target.value) })}
        />
      </div>
    </div>
  )
}
