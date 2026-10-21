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

export interface Marker {
  id: string
  type: UtilityType
  /** Normalized position relative to the photo, 0..1. */
  x: number
  y: number
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
