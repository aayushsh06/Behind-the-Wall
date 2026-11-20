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
