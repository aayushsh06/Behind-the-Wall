import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import type { Point } from '@/components/photo/coordinates'
import { toNormalizedPoint, toPercentStyle } from '@/components/photo/coordinates'
import type { UtilityType } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'
import { cn } from '@/lib/cn'

const DRAG_THRESHOLD_PX = 6

interface MarkerPinProps {
  index: number
  type: UtilityType
  position: Point
  selected?: boolean
  draggable?: boolean
  /** Element the normalized coordinates are relative to (the photo box). */
  surfaceRef: React.RefObject<HTMLElement | null>
  onSelect?: () => void
  onMove?: (point: Point) => void
}

export function MarkerPin({
  index,
  type,
  position,
  selected,
  draggable,
  surfaceRef,
  onSelect,
  onMove,
}: MarkerPinProps) {
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!draggable) return
    start.current = { x: event.clientX, y: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!start.current || !surfaceRef.current) return
    const dx = event.clientX - start.current.x
    const dy = event.clientY - start.current.y
    if (!start.current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
    start.current.moved = true
    onMove?.(toNormalizedPoint(surfaceRef.current, event.clientX, event.clientY))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const wasDrag = start.current?.moved
    start.current = null
    if (!wasDrag) onSelect?.()
  }

  return (
    <button
      type="button"
      aria-label={`${UTILITY_META[type].label} marker ${index}`}
      aria-pressed={selected}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => (start.current = null)}
      onClick={(event) => event.stopPropagation()}
      style={{ ...toPercentStyle(position), backgroundColor: UTILITY_META[type].hex }}
      className={cn(
        'absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
        'border-2 border-white text-sm font-bold text-white shadow-md touch-none',
        selected && 'ring-4 ring-stone-900/40 scale-110',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
      )}
    >
      {index}
    </button>
  )
}
