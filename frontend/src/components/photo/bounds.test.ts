import { describe, expect, it } from 'vitest'

import { clampToBounds, insideBounds, strokeLength } from '@/components/photo/bounds'

const frame = { x0: 0.2, y0: 0.1, x1: 0.8, y1: 0.9 }

describe('wall frame bounds', () => {
  it('knows whether a point is inside the frame', () => {
    expect(insideBounds({ x: 0.5, y: 0.5 }, frame)).toBe(true)
    expect(insideBounds({ x: 0.1, y: 0.5 }, frame)).toBe(false)
    expect(insideBounds({ x: 0.5, y: 0.95 }, frame)).toBe(false)
  })

  it('keeps a stroke that wanders out pinned to the frame edge', () => {
    expect(clampToBounds({ x: 0.95, y: 0.05 }, frame)).toEqual({ x: 0.8, y: 0.1 })
    expect(clampToBounds({ x: 0.5, y: 0.5 }, frame)).toEqual({ x: 0.5, y: 0.5 })
  })

  it('measures stroke length so tiny stray swipes can be ignored', () => {
    expect(strokeLength([{ x: 0, y: 0 }, { x: 0.03, y: 0.04 }, { x: 0.03, y: 0.14 }])).toBeCloseTo(0.15)
    expect(strokeLength([{ x: 0.5, y: 0.5 }])).toBe(0)
  })
})

describe('straight lines', () => {
  it('squares up nearly level and nearly plumb lines, judged on screen', async () => {
    const { snapToAxis } = await import('@/components/photo/bounds')
    const start = { x: 0.2, y: 0.5 }
    // On a square photo, 3° off level becomes level and 87° becomes plumb.
    expect(snapToAxis(start, { x: 0.6, y: 0.521 }, 1)).toEqual({ x: 0.6, y: 0.5 })
    expect(snapToAxis(start, { x: 0.215, y: 0.8 }, 1)).toEqual({ x: 0.2, y: 0.8 })
    // A clear diagonal is left alone.
    expect(snapToAxis(start, { x: 0.5, y: 0.8 }, 1)).toEqual({ x: 0.5, y: 0.8 })
  })
})
