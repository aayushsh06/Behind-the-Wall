import { describe, expect, it } from 'vitest'

import type { PixelImage, Pt } from '@/features/capture/snapPath'
import { resample, simplify, snapStroke } from '@/features/capture/snapPath'

/** Deterministic pseudo-random numbers so the tests never flake. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const W = 240
const H = 160

/** A wood-coloured, slightly noisy background with yellow wires along `curves`. */
function photo(curve: ((x: number) => number) | ((x: number) => number)[], wireWidth = 4, noise = 18): PixelImage {
  const curves = Array.isArray(curve) ? curve : [curve]
  const random = rng(7)
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const onWire = curves.some((c) => Math.abs(y - c(x)) <= wireWidth / 2)
      const [r, g, b] = onWire ? [225, 190, 40] : [160, 115, 75]
      const n = (random() - 0.5) * noise
      data[i] = r + n
      data[i + 1] = g + n
      data[i + 2] = b + n
      data[i + 3] = 255
    }
  }
  return { width: W, height: H, data }
}

const wave = (x: number) => 80 + 22 * Math.sin(x / 30)

/** Average distance from each output point to the true curve. */
function meanError(points: Pt[], curve: (x: number) => number): number {
  const dense = resample(points, 2)
  return dense.reduce((sum, p) => sum + Math.abs(p.y - curve(p.x)), 0) / dense.length
}

/** A wobbly hand-drawn trace of the curve, offset by `offset` px. */
function handDrawn(curve: (x: number) => number, offset: number): Pt[] {
  const random = rng(3)
  const stroke: Pt[] = []
  for (let x = 25; x <= 215; x += 6) stroke.push({ x, y: curve(x) + offset + (random() - 0.5) * 6 })
  return stroke
}

describe('snapStroke', () => {
  it('pulls a sloppy trace onto the wire it was drawn over', () => {
    const image = photo(wave)
    const stroke = handDrawn(wave, 8)
    const result = snapStroke(image, stroke, { corridor: 16 })
    expect(result.snapped).toBe(true)
    expect(meanError(stroke, wave)).toBeGreaterThan(7)
    expect(meanError(result.points, wave)).toBeLessThan(2.5)
  })

  it('works for a trace drawn on the other side of the wire too', () => {
    const image = photo(wave)
    const result = snapStroke(image, handDrawn(wave, -9), { corridor: 16 })
    expect(result.snapped).toBe(true)
    expect(meanError(result.points, wave)).toBeLessThan(2.5)
  })

  it('keeps the drawing (smoothed) when there is nothing to snap to', () => {
    const blank = photo(() => -1000) // no wire anywhere
    const stroke = handDrawn(wave, 0)
    const result = snapStroke(blank, stroke, { corridor: 16 })
    expect(result.snapped).toBe(false)
    expect(meanError(result.points, wave)).toBeLessThan(4)
  })

  it('does not jump to a wire outside the corridor', () => {
    const image = photo((x) => wave(x) + 45) // the real wire is far below the trace
    const stroke = handDrawn(wave, 0)
    const result = snapStroke(image, stroke, { corridor: 12 })
    for (const p of result.points) expect(Math.abs(p.y - wave(p.x))).toBeLessThan(16)
  })

  it('keeps to the nearer of two parallel cables of the same colour', () => {
    const lower = (x: number) => wave(x) + 18
    const image = photo([wave, lower])
    const nearUpper = snapStroke(image, handDrawn(wave, 6), { corridor: 24 })
    expect(nearUpper.snapped).toBe(true)
    expect(meanError(nearUpper.points, wave)).toBeLessThan(3)
    const nearLower = snapStroke(image, handDrawn(lower, -6), { corridor: 24 })
    expect(nearLower.snapped).toBe(true)
    expect(meanError(nearLower.points, lower)).toBeLessThan(3)
  })

  it('treats a tap-sized stroke as too short to snap', () => {
    const result = snapStroke(photo(wave), [{ x: 100, y: 80 }, { x: 103, y: 81 }])
    expect(result.snapped).toBe(false)
  })

  it('returns a compact path', () => {
    const result = snapStroke(photo(wave), handDrawn(wave, 6), { corridor: 16 })
    expect(result.points.length).toBeLessThanOrEqual(120)
    expect(result.points.length).toBeGreaterThan(3)
  })
})

describe('simplify', () => {
  it('drops points on a straight line and keeps corners', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 5, y: 0.1 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]
    expect(simplify(line, 0.5)).toEqual([line[0], line[2], line[3]])
  })
})
