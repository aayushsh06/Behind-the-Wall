/** Shared data shapes. These mirror the backend Pydantic schemas exactly. */

export type UtilityType = 'water' | 'gas' | 'pipe' | 'wire' | 'framing' | 'other'
export const UTILITY_TYPES: readonly UtilityType[] = ['water', 'gas', 'pipe', 'wire', 'framing', 'other']

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
  /** When creating: the homeowner whose account receives the wall. */
  homeowner_email?: string
  /** When creating for an email with no account yet: hold the wall and invite them. */
  invite?: boolean
}

/** A marker before the server assigns an id (id is optional on input). */
export type MarkerInput = Omit<Marker, 'id'> & { id?: string }

/** The homeowner a wall belongs to, or the account that recorded it. */
export interface AccountBrief {
  id: string
  name: string
  email: string
  role: Role
}

export interface Wall extends Omit<WallInput, 'markers' | 'homeowner_email' | 'invite'> {
  id: string
  schema_version: number
  markers: Marker[]
  /** Counts saves; each edit produces a newer PDF. */
  revision: number
  /** The homeowner whose account holds the wall; null while an invite is pending. */
  owner: AccountBrief | null
  /** Email of an invited homeowner who hasn't signed up yet. */
  pending_owner_email: string | null
  /** The tradesperson who recorded it. */
  created_by: AccountBrief | null
  last_edited_by: AccountBrief | null
  /** What the signed-in account may do with this wall. */
  can_edit: boolean
  can_delete: boolean
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
  revision: number
  owner: AccountBrief | null
  pending_owner_email: string | null
  created_by: AccountBrief | null
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

/**
 * Homeowners read every wall in their account (read-only). Tradespeople record walls into
 * a homeowner's account by email and edit the walls they recorded, or every wall in a
 * home whose owner approved their access request.
 */
export type Role = 'homeowner' | 'tradesperson'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  /** False until the account clicks the link in its confirmation email. */
  email_verified: boolean
}

export type AccessStatus = 'pending' | 'approved' | 'declined' | 'revoked'

/** A tradesperson's request to edit a homeowner's walls, and its outcome. */
export interface AccessGrant {
  id: string
  status: AccessStatus
  message: string
  created_at: string
  decided_at: string | null
  homeowner: AccountBrief
  tradesperson: AccountBrief
}

export type HomeownerStatus = 'registered' | 'unconfirmed' | 'not_registered' | 'not_a_homeowner'

export interface InviteResult {
  email: string
  invite_url: string
  /** True when the server emailed it; otherwise the tradesperson sends invite_url. */
  emailed: boolean
  detail: string
}
