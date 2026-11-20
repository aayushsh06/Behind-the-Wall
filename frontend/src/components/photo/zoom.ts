/**
 * Zoom and pan maths for the photo viewport, kept pure so it can be tested.
 *
 * The content is drawn with `transform: translate(x, y) scale(scale)` from its top-left
 * corner, inside a viewport of the same size at scale 1. Positions are viewport pixels.
 */

export interface View {
  scale: number
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface XY {
  x: number
  y: number
}

export const MIN_SCALE = 1
export const MAX_SCALE = 5
export const IDENTITY: View = { scale: 1, x: 0, y: 0 }

/** Keep the scale in range and the content covering the whole viewport (no gaps). */
export function clampView(view: View, size: Size): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale))
  return {
    scale,
    x: Math.min(0, Math.max(size.width - size.width * scale, view.x)),
    y: Math.min(0, Math.max(size.height - size.height * scale, view.y)),
  }
}

/** Zoom by `factor` keeping the content point under `focus` fixed on screen. */
export function zoomAround(view: View, factor: number, focus: XY, size: Size): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor))
  const contentX = (focus.x - view.x) / view.scale
  const contentY = (focus.y - view.y) / view.scale
  return clampView({ scale, x: focus.x - contentX * scale, y: focus.y - contentY * scale }, size)
}

export interface PinchStart {
  view: View
  distance: number
  midpoint: XY
}

/**
 * Two-finger gesture: the spread between the fingers sets the zoom, and the point that
 * started under their midpoint follows the midpoint as they move (so it also pans).
 */
export function pinchView(start: PinchStart, distance: number, midpoint: XY, size: Size): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, start.view.scale * (distance / Math.max(1, start.distance))))
  const contentX = (start.midpoint.x - start.view.x) / start.view.scale
  const contentY = (start.midpoint.y - start.view.y) / start.view.scale
  return clampView({ scale, x: midpoint.x - contentX * scale, y: midpoint.y - contentY * scale }, size)
}
