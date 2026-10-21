import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import type { Point } from '@/components/photo/coordinates'
import { toNormalizedPoint } from '@/components/photo/coordinates'

const DRAG_THRESHOLD_PX = 6

interface DragHandleOptions {
  /** Element the normalized coordinates are relative to (the photo box). */
  surfaceRef: React.RefObject<HTMLElement | null>
  enabled: boolean
  /** Called with the pointer's normalized position and the previous one (for deltas). */
  onMove?: (point: Point, previous: Point) => void
  /** Called on a press that did not turn into a drag. */
  onTap?: () => void
}

interface DragState {
  startX: number
  startY: number
  moved: boolean
  last: Point
}

/**
 * Pointer handlers that distinguish a tap from a drag and report drag positions in
 * normalized coordinates. Shared by marker pins, line endpoints, and calibration corners.
 */
export function useDragHandle({ surfaceRef, enabled, onMove, onTap }: DragHandleOptions) {
  const state = useRef<DragState | null>(null)

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation()
    if (!enabled || !surfaceRef.current) return
    state.current = {
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      last: toNormalizedPoint(surfaceRef.current, event.clientX, event.clientY),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = state.current
    if (!current || !surfaceRef.current) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (!current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
    current.moved = true
    const point = toNormalizedPoint(surfaceRef.current, event.clientX, event.clientY)
    onMove?.(point, current.last)
    current.last = point
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation()
    const wasDrag = state.current?.moved ?? false
    state.current = null
    if (!wasDrag) onTap?.()
  }

  const onPointerCancel = () => {
    state.current = null
  }

  const onClick = (event: React.MouseEvent<HTMLElement>) => event.stopPropagation()

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick }
}
