/** Shared data shapes. These mirror the backend Pydantic schemas exactly. */

export type UtilityType = 'pipe' | 'wire' | 'framing' | 'other'
export const UTILITY_TYPES: readonly UtilityType[] = ['pipe', 'wire', 'framing', 'other']

export type Coverage = 'full' | 'partial' | 'none'
export const COVERAGES: readonly Coverage[] = ['full', 'partial', 'none']

/** Axis-aligned rectangle in normalized photo coordinates (0..1). */
export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export type LengthUnit = 'in' | 'cm'
export const LENGTH_UNITS: readonly LengthUnit[] = ['in', 'cm']

/** A position in normalized photo coordinates (0..1). */
export interface Point {
  x: number
  y: number
}

/**
 * Maps photo coordinates to real wall positions: where the wall's top-left and
 * bottom-right corners appear in the photo, plus the wall's real width and height.
 */
export interface WallCalibration {
  top_left: Point
  bottom_right: Point
  width: number
  height: number
  unit: LengthUnit
}

export type MarkerKind = 'point' | 'line'
export const MARKER_KINDS: readonly MarkerKind[] = ['point', 'line']

export interface Marker {
  id: string
  type: UtilityType
  kind: MarkerKind
  /** Normalized position relative to the photo, 0..1. For a line this is the start. */
  x: number
  y: number
  /** Line end point; null for point markers. */
  x2: number | null
  y2: number | null
  measurement: string
  reference_point: string
  note: string
}

/** Fields the client sends when creating or replacing a wall. */
export interface WallInput {
  room: string
  label: string
  author: string
  /** ISO date, YYYY-MM-DD. */
  observed_date: string
  coverage: Coverage
  coverage_note: string
  uncovered_region: Region | null
  photo_id: string | null
  calibration: WallCalibration | null
  markers: MarkerInput[]
  notes: string
}

/** A marker before the server assigns an id (id is optional on input). */
export type MarkerInput = Omit<Marker, 'id'> & { id?: string }

export interface Wall extends Omit<WallInput, 'markers'> {
  id: string
  schema_version: number
  markers: Marker[]
  created_at: string
  updated_at: string
}

export interface WallSummary {
  id: string
  room: string
  label: string
  author: string
  observed_date: string
  coverage: Coverage
  photo_id: string | null
  marker_count: number
  updated_at: string
}

export interface Photo {
  id: string
  content_type: string
  width: number
  height: number
  size_bytes: number
  created_at: string
}
