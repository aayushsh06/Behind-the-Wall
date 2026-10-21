import type { Marker } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'
import { cn } from '@/lib/cn'

interface MarkerRowProps {
  index: number
  marker: Marker
  selected?: boolean
  onSelect?: () => void
}

export function MarkerRow({ index, marker, selected, onSelect }: MarkerRowProps) {
  const meta = UTILITY_META[marker.type]
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          'flex w-full items-start gap-3 rounded-xl border p-3 text-left',
          selected ? 'border-stone-900 bg-stone-100' : 'border-stone-200 bg-white',
        )}
      >
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: meta.hex }}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {meta.label} · {marker.measurement}
          </span>
          {marker.reference_point ? (
            <span className="block text-sm text-stone-600">From: {marker.reference_point}</span>
          ) : null}
          {marker.note ? <span className="block text-xs text-stone-500">{marker.note}</span> : null}
        </span>
      </button>
    </li>
  )
}
