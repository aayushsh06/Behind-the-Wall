import { Button, SegmentedControl, TextField } from '@/components/ui'
import type { SegmentOption } from '@/components/ui'
import type { Marker, UtilityType } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'
import { UTILITY_TYPES } from '@/domain/types'

const TYPE_OPTIONS: readonly SegmentOption<UtilityType>[] = UTILITY_TYPES.map((type) => ({
  value: type,
  label: UTILITY_META[type].label,
  swatch: UTILITY_META[type].hex,
}))

interface MarkerFormProps {
  marker: Marker
  onChange: (changes: Partial<Omit<Marker, 'id'>>) => void
  onDelete: () => void
  onDone: () => void
}

export function MarkerForm({ marker, onChange, onDelete, onDone }: MarkerFormProps) {
  const canFinish = marker.measurement.trim().length > 0
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl label="What is it?" options={TYPE_OPTIONS} value={marker.type} onChange={(type) => onChange({ type })} />
      <TextField
        label="Measurement"
        placeholder="18 in above floor"
        autoFocus
        value={marker.measurement}
        onChange={(event) => onChange({ measurement: event.target.value })}
        error={canFinish ? undefined : 'Required so someone can find it later'}
      />
      <TextField
        label="Measured from"
        placeholder="Left edge of outlet"
        value={marker.reference_point}
        onChange={(event) => onChange({ reference_point: event.target.value })}
      />
      <TextField
        multiline
        label="Note (optional)"
        placeholder="Runs up and left toward the window"
        value={marker.note}
        onChange={(event) => onChange({ note: event.target.value })}
      />
      <div className="flex gap-2">
        <Button variant="danger" onClick={onDelete}>
          Delete
        </Button>
        <Button fullWidth onClick={onDone} disabled={!canFinish}>
          Done
        </Button>
      </div>
    </div>
  )
}
