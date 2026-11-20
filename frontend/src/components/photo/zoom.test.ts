import { describe, expect, it } from 'vitest'

import { clampView, IDENTITY, MAX_SCALE, pinchView, zoomAround } from '@/components/photo/zoom'

const size = { width: 400, height: 200 }
/** Where a content point (in unscaled viewport px) appears on screen. */
const onScreen = (view: { scale: number; x: number; y: number }, p: { x: number; y: number }) => ({
  x: view.x + p.x * view.scale,
  y: view.y + p.y * view.scale,
})

describe('zoom maths', () => {
  it('keeps the focus point still while zooming in', () => {
    const view = zoomAround(IDENTITY, 2, { x: 100, y: 50 }, size)
    expect(view.scale).toBe(2)
    expect(onScreen(view, { x: 100, y: 50 })).toEqual({ x: 100, y: 50 })
  })

  it('never zooms out past the whole photo or in past the maximum', () => {
    expect(zoomAround(IDENTITY, 0.5, { x: 0, y: 0 }, size)).toEqual(IDENTITY)
    expect(zoomAround(IDENTITY, 50, { x: 200, y: 100 }, size).scale).toBe(MAX_SCALE)
  })

  it('never leaves a gap at the edges', () => {
    const view = clampView({ scale: 2, x: 50, y: -1000 }, size)
    expect(view.x).toBe(0) // can't pull the left edge inwards
    expect(view.y).toBe(-200) // can't push the bottom edge past the viewport
  })

  it('pinch: spreading fingers zooms, and the midpoint carries the photo with it', () => {
    const start = { view: IDENTITY, distance: 100, midpoint: { x: 200, y: 100 } }
    const zoomed = pinchView(start, 300, { x: 200, y: 100 }, size)
    expect(zoomed.scale).toBe(3)
    expect(onScreen(zoomed, { x: 200, y: 100 })).toEqual({ x: 200, y: 100 })

    const panned = pinchView({ ...start, view: zoomed }, 100, { x: 180, y: 90 }, size)
    expect(panned.scale).toBe(3)
    expect(onScreen(panned, { x: 200, y: 100 })).toEqual({ x: 180, y: 90 })
  })
})
