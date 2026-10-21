import type { Point } from '@/components/photo/coordinates'
import { toPercentStyle } from '@/components/photo/coordinates'
import { useDragHandle } from '@/components/photo/useDragHandle'
import type { UtilityType } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'
import { cn } from '@/lib/cn'

interface MarkerPinProps {
  index: number
  type: UtilityType
  position: Point
  selected?: boolean
  draggable?: boolean
  surfaceRef: React.RefObject<HTMLElement | null>
  onSelect?: () => void
  /** Receives the new position and the previous pointer position (for deltas). */
  onMove?: (point: Point, previous: Point) => void
}

/** Numbered, color-coded badge for a marker. Also used as the grab handle for a line. */
export function MarkerPin({ index, type, position, selected, draggable, surfaceRef, onSelect, onMove }: MarkerPinProps) {
  const handlers = useDragHandle({ surfaceRef, enabled: Boolean(draggable), onMove, onTap: onSelect })

  return (
    <button
      type="button"
      aria-label={`${UTILITY_META[type].label} marker ${index}`}
      aria-pressed={selected}
      {...handlers}
      style={{ ...toPercentStyle(position), backgroundColor: UTILITY_META[type].hex }}
      className={cn(
        'absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
        'border-2 border-white text-sm font-bold text-white shadow-md touch-none',
        selected && 'ring-4 ring-accent/70 scale-110',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
      )}
    >
      {index}
    </button>
  )
}
