/**
 * Convert normalized photo coordinates into real wall positions.
 *
 * Origin is the wall's bottom-left corner, so positions read as "from the left edge"
 * and "above the floor". Linear interpolation between the calibrated corners; this
 * assumes a roughly frontal photo. Mirrors backend/app/services/geometry.py.
 */

import type { LengthUnit, Marker, Point, WallCalibration } from '@/domain/types'

export interface PhysicalPoint {
  fromLeft: number
  fromFloor: number
  unit: LengthUnit
}

export interface PhysicalLine {
  start: PhysicalPoint
  end: PhysicalPoint
  length: number
  unit: LengthUnit
}

export function physicalPoint(point: Point, calibration: WallCalibration): PhysicalPoint {
  const { top_left: tl, bottom_right: br } = calibration
  const fx = (point.x - tl.x) / (br.x - tl.x)
  const fy = (br.y - point.y) / (br.y - tl.y)
  return { fromLeft: fx * calibration.width, fromFloor: fy * calibration.height, unit: calibration.unit }
}

export function physicalLine(start: Point, end: Point, calibration: WallCalibration): PhysicalLine {
  const a = physicalPoint(start, calibration)
  const b = physicalPoint(end, calibration)
  return { start: a, end: b, length: Math.hypot(b.fromLeft - a.fromLeft, b.fromFloor - a.fromFloor), unit: a.unit }
}

/** Round to a sensible precision and attach the unit (feet and inches for inches). */
export function formatLength(value: number, unit: LengthUnit): string {
  if (unit === 'in') {
    const total = Math.round(value * 2) / 2
    const feet = Math.floor(total / 12)
    const inches = total - feet * 12
    return feet >= 1 ? `${feet} ft ${inches} in` : `${inches} in`
  }
  return `${Math.round(value)} cm`
}

export function describePoint(point: PhysicalPoint): string {
  return `${formatLength(point.fromLeft, point.unit)} from left, ${formatLength(point.fromFloor, point.unit)} above floor`
}

export function describeLine(line: PhysicalLine): string {
  return `${formatLength(line.length, line.unit)} long, from (${describePoint(line.start)}) to (${describePoint(line.end)})`
}

export interface MarkerPosition {
  /** One-line summary, e.g. "4 ft 6 in from left, 18 in above floor". */
  summary: string
  /** Line length when the marker is a line. */
  length?: string
}

type MarkerGeometry = Pick<Marker, 'kind' | 'x' | 'y' | 'x2' | 'y2'>

/** Computed position for a marker, or null when the wall is not calibrated. */
export function markerPosition(marker: MarkerGeometry, calibration: WallCalibration | null): MarkerPosition | null {
  if (!calibration) return null
  if (marker.kind === 'line' && marker.x2 !== null && marker.y2 !== null) {
    const line = physicalLine({ x: marker.x, y: marker.y }, { x: marker.x2, y: marker.y2 }, calibration)
    return {
      summary: `${describePoint(line.start)} → ${describePoint(line.end)}`,
      length: formatLength(line.length, line.unit),
    }
  }
  return { summary: describePoint(physicalPoint(marker, calibration)) }
}

export function describeWallSize(calibration: WallCalibration): string {
  return `${formatLength(calibration.width, calibration.unit)} × ${formatLength(calibration.height, calibration.unit)}`
}

/** Minimum corner separation (normalized) for a calibration to be usable. */
export const MIN_CALIBRATION_SPAN = 0.02

export function isCalibrationValid(calibration: WallCalibration | null): calibration is WallCalibration {
  if (!calibration) return false
  const { top_left: tl, bottom_right: br } = calibration
  return (
    br.x - tl.x >= MIN_CALIBRATION_SPAN &&
    br.y - tl.y >= MIN_CALIBRATION_SPAN &&
    calibration.width > 0 &&
    calibration.height > 0
  )
}
