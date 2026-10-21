export interface Point {
  x: number
  y: number
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Convert a pointer event position into normalized (0..1) coordinates within an element. */
export function toNormalizedPoint(
  element: HTMLElement,
  clientX: number,
  clientY: number,
): Point {
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  }
}

/** CSS position for a normalized point. */
export function toPercentStyle(point: Point): { left: string; top: string } {
  return { left: `${point.x * 100}%`, top: `${point.y * 100}%` }
}
