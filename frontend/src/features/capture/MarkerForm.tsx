import { Button, SegmentedControl, TextField } from '@/components/ui'
import type { SegmentOption } from '@/components/ui'
import type { MarkerPosition } from '@/domain/geometry'
import type { Marker, UtilityType } from '@/domain/types'
import { UTILITY_TYPES } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'

const TYPE_OPTIONS: readonly SegmentOption<UtilityType>[] = UTILITY_TYPES.map((type) => ({
  value: type,
  label: UTILITY_META[type].label,
  swatch: UTILITY_META[type].hex,
}))

interface MarkerFormProps {
  marker: Marker
  /** Computed from the wall calibration; null when the wall size was not recorded. */
  position: MarkerPosition | null
  onChange: (changes: Partial<Omit<Marker, 'id'>>) => void
  onDelete: () => void
  onDone: () => void
}

export function MarkerForm({ marker, position, onChange, onDelete, onDone }: MarkerFormProps) {
  const measurementRequired = position === null
  const canFinish = !measurementRequired || marker.measurement.trim().length > 0

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl label="What is it?" options={TYPE_OPTIONS} value={marker.type} onChange={(type) => onChange({ type })} />

      {position ? (
        <div className="rounded-xl bg-stone-100 px-3 py-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {marker.kind === 'line' ? 'Computed run' : 'Computed position'}
          </p>
          {position.length ? <p className="font-semibold">{position.length} long</p> : null}
          <p>{position.summary}</p>
        </div>
      ) : null}

      <TextField
        label={measurementRequired ? 'Measurement' : 'Measurement (optional)'}
        placeholder={marker.kind === 'line' ? '1/2 in copper, runs to ceiling' : '18 in above floor'}
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
