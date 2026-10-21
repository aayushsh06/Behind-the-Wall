import type { Point } from '@/components/photo/coordinates'
import { toPercentStyle } from '@/components/photo/coordinates'
import { useDragHandle } from '@/components/photo/useDragHandle'
import { cn } from '@/lib/cn'

interface HandleProps {
  label: string
  position: Point
  surfaceRef: React.RefObject<HTMLElement | null>
  color?: string
  onMove: (point: Point) => void
}

/** Small draggable knob used for line endpoints and calibration corners. */
export function Handle({ label, position, surfaceRef, color = '#111827', onMove }: HandleProps) {
  const handlers = useDragHandle({ surfaceRef, enabled: true, onMove: (point) => onMove(point) })
  return (
    <button
      type="button"
      aria-label={label}
      {...handlers}
      style={{ ...toPercentStyle(position), borderColor: color }}
      className={cn(
        'absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white shadow-md',
        'touch-none cursor-grab active:cursor-grabbing',
      )}
    />
  )
}
