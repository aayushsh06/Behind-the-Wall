import { markerPosition } from '@/domain/geometry'
import type { Marker, WallCalibration } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'
import { cn } from '@/lib/cn'

interface MarkerRowProps {
  index: number
  marker: Marker
  calibration?: WallCalibration | null
  selected?: boolean
  onSelect?: () => void
}

export function MarkerRow({ index, marker, calibration, selected, onSelect }: MarkerRowProps) {
  const meta = UTILITY_META[marker.type]
  const position = markerPosition(marker, calibration ?? null)
  const title = [meta.label + (marker.kind === 'line' ? ' run' : ''), marker.measurement.trim()]
    .filter(Boolean)
    .join(' · ')

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors',
          selected ? 'border-accent/60 bg-accent/5' : 'border-line bg-surface hover:border-line-strong',
        )}
      >
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-bg"
          style={{ backgroundColor: meta.hex }}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {position ? (
            <span className="mt-0.5 block text-[13px] text-fg-muted">
              {position.length ? `${position.length} · ` : ''}
              {position.summary}
            </span>
          ) : null}
          {marker.reference_point ? (
            <span className="mt-0.5 block text-[13px] text-fg-muted">From: {marker.reference_point}</span>
          ) : null}
          {marker.note ? <span className="mt-0.5 block text-xs text-fg-faint">{marker.note}</span> : null}
        </span>
      </button>
    </li>
  )
}
