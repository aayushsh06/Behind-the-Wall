import { describe, expect, it } from 'vitest'

import {
  describeWallSize,
  formatLength,
  isCalibrationValid,
  markerPosition,
  physicalLine,
  physicalPoint,
} from '@/domain/geometry'
import type { WallCalibration } from '@/domain/types'

const calibration: WallCalibration = {
  top_left: { x: 0.1, y: 0.1 },
  bottom_right: { x: 0.9, y: 0.9 },
  width: 120,
  height: 96,
  unit: 'in',
}

describe('physicalPoint', () => {
  it('maps the bottom-left corner to the origin', () => {
    const p = physicalPoint({ x: 0.1, y: 0.9 }, calibration)
    expect(p.fromLeft).toBeCloseTo(0)
    expect(p.fromFloor).toBeCloseTo(0)
  })

  it('maps the center to half the wall size', () => {
    const p = physicalPoint({ x: 0.5, y: 0.5 }, calibration)
    expect(p.fromLeft).toBeCloseTo(60)
    expect(p.fromFloor).toBeCloseTo(48)
  })
})

describe('physicalLine', () => {
  it('measures length in real units', () => {
    const line = physicalLine({ x: 0.1, y: 0.9 }, { x: 0.9, y: 0.9 }, calibration)
    expect(line.length).toBeCloseTo(120)
  })
})

describe('formatLength', () => {
  it('uses feet and inches at half-inch precision', () => {
    expect(formatLength(54, 'in')).toBe('4 ft 6 in')
    expect(formatLength(7.3, 'in')).toBe('7.5 in')
    expect(formatLength(91.4, 'cm')).toBe('91 cm')
  })
})

describe('markerPosition', () => {
  it('returns null without calibration', () => {
    expect(markerPosition({ kind: 'point', x: 0.5, y: 0.5, x2: null, y2: null }, null)).toBeNull()
  })

  it('describes a point', () => {
    const pos = markerPosition({ kind: 'point', x: 0.5, y: 0.5, x2: null, y2: null }, calibration)
    expect(pos?.summary).toBe('5 ft 0 in from left, 4 ft 0 in above floor')
    expect(pos?.length).toBeUndefined()
  })

  it('describes a horizontal run compactly', () => {
    const pos = markerPosition({ kind: 'line', x: 0.1, y: 0.9, x2: 0.9, y2: 0.9 }, calibration)
    expect(pos?.length).toBe('10 ft 0 in')
    expect(pos?.summary).toBe('Horizontal, 0 in above floor, from 0 in to 10 ft 0 in from left')
  })

  it('describes a vertical run compactly', () => {
    const pos = markerPosition({ kind: 'line', x: 0.5, y: 0.9, x2: 0.5, y2: 0.5 }, calibration)
    expect(pos?.length).toBe('4 ft 0 in')
    expect(pos?.summary).toBe('Vertical, 5 ft 0 in from left, from 0 in to 4 ft 0 in above floor')
  })

  it('falls back to both endpoints for a diagonal run', () => {
    const pos = markerPosition({ kind: 'line', x: 0.1, y: 0.9, x2: 0.9, y2: 0.1 }, calibration)
    expect(pos?.summary.startsWith('From (')).toBe(true)
  })
})

describe('calibration helpers', () => {
  it('formats wall size', () => {
    expect(describeWallSize(calibration)).toBe('10 ft 0 in × 8 ft 0 in')
  })

  it('rejects inverted or degenerate corners', () => {
    expect(isCalibrationValid({ ...calibration, bottom_right: { x: 0.1, y: 0.9 } })).toBe(false)
    expect(isCalibrationValid({ ...calibration, width: 0 })).toBe(false)
    expect(isCalibrationValid(calibration)).toBe(true)
  })
})
