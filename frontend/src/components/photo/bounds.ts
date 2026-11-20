import type { Point } from '@/components/photo/coordinates'

/** A rectangle in normalized photo coordinates (0-1). */
export interface Bounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

export const FULL_PHOTO: Bounds = { x0: 0, y0: 0, x1: 1, y1: 1 }

export const insideBounds = (p: Point, b: Bounds): boolean => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1

export const clampToBounds = (p: Point, b: Bounds): Point => ({
  x: Math.min(b.x1, Math.max(b.x0, p.x)),
  y: Math.min(b.y1, Math.max(b.y0, p.y)),
})

/** Total length of a stroke in normalized units. */
export const strokeLength = (points: Point[]): number =>
  points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y), 0)

/** Lines within this many degrees of level or plumb are made exactly level or plumb. */
export const AXIS_SNAP_DEGREES = 6

/**
 * Straighten a line that is nearly level or plumb. Points are normalized; `aspect` is the
 * photo's width / height, so the angle is judged as it looks on screen.
 */
export function snapToAxis(start: Point, end: Point, aspect: number): Point {
  const dx = Math.abs(end.x - start.x) * aspect
  const dy = Math.abs(end.y - start.y)
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  if (angle <= AXIS_SNAP_DEGREES) return { x: end.x, y: start.y }
  if (angle >= 90 - AXIS_SNAP_DEGREES) return { x: start.x, y: end.y }
  return end
}
