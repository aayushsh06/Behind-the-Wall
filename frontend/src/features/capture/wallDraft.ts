/** Client-side draft of a wall record and the pure reducer that edits it. */

import type { Point } from '@/components/photo'
import type { CalibrationCorner, LineEndpoint } from '@/components/photo'
import type { Coverage, LengthUnit, Marker, Region, UtilityType, Wall, WallCalibration, WallInput } from '@/domain/types'
import { todayIso } from '@/lib/format'

export interface DraftPhoto {
  id: string
  width: number
  height: number
  url: string
}

export interface WallDraft {
  photo: DraftPhoto | null
  room: string
  label: string
  author: string
  observedDate: string
  coverage: Coverage
  coverageNote: string
  uncoveredRegion: Region | null
  calibration: WallCalibration | null
  markers: Marker[]
  notes: string
  /** Tradesperson creating a wall: which homeowner's account it goes into. */
  homeownerEmail: string
  /** The email has no account yet: hold the wall for them and invite them. */
  inviteHomeowner: boolean
  selectedMarkerId: string | null
}

export const DEFAULT_REGION: Region = { x: 0, y: 0, width: 1, height: 0.5 }
export const DEFAULT_MARKER_TYPE: UtilityType = 'pipe'
/** Starting guess for the wall corners: inset so both handles are visible and grabbable. */
export const DEFAULT_CALIBRATION: WallCalibration = {
  top_left: { x: 0.08, y: 0.08 },
  bottom_right: { x: 0.92, y: 0.92 },
  width: 120,
  height: 96,
  unit: 'in',
}

export function emptyDraft(author = '', homeownerEmail = ''): WallDraft {
  return {
    photo: null,
    room: '',
    label: '',
    author,
    observedDate: todayIso(),
    coverage: 'none',
    coverageNote: '',
    uncoveredRegion: null,
    calibration: null,
    markers: [],
    notes: '',
    homeownerEmail,
    inviteHomeowner: false,
    selectedMarkerId: null,
  }
}

export function draftFromWall(wall: Wall, photoUrl: (id: string) => string, size: { width: number; height: number } | null): WallDraft {
  return {
    photo:
      wall.photo_id && size
        ? { id: wall.photo_id, width: size.width, height: size.height, url: photoUrl(wall.photo_id) }
        : null,
    room: wall.room,
    label: wall.label,
    author: wall.author,
    observedDate: wall.observed_date,
    coverage: wall.coverage,
    coverageNote: wall.coverage_note,
    uncoveredRegion: wall.uncovered_region,
    calibration: wall.calibration,
    markers: wall.markers,
    notes: wall.notes,
    homeownerEmail: wall.owner?.email ?? wall.pending_owner_email ?? '',
    inviteHomeowner: false,
    selectedMarkerId: null,
  }
}

export function draftToInput(draft: WallDraft): WallInput {
  return {
    room: draft.room.trim(),
    label: draft.label.trim(),
    author: draft.author.trim(),
    observed_date: draft.observedDate,
    coverage: draft.coverage,
    coverage_note: draft.coverageNote.trim(),
    uncovered_region: draft.coverage === 'partial' ? draft.uncoveredRegion : null,
    photo_id: draft.photo?.id ?? null,
    calibration: draft.photo ? draft.calibration : null,
    markers: draft.markers.map(({ id: _id, ...rest }) => rest),
    notes: draft.notes.trim(),
    ...(draft.homeownerEmail.trim() ? { homeowner_email: draft.homeownerEmail.trim() } : {}),
    ...(draft.inviteHomeowner ? { invite: true } : {}),
  }
}

type TextField = 'room' | 'label' | 'author' | 'observedDate' | 'coverageNote' | 'notes' | 'homeownerEmail'

export type DraftAction =
  | { type: 'setPhoto'; photo: DraftPhoto }
  | { type: 'clearPhoto' }
  | { type: 'setField'; field: TextField; value: string }
  | { type: 'setInvite'; invite: boolean }
  | { type: 'setCoverage'; coverage: Coverage }
  | { type: 'setRegion'; region: Region }
  | { type: 'setCalibration'; calibration: WallCalibration | null }
  | { type: 'moveCalibrationCorner'; corner: CalibrationCorner; point: Point }
  | { type: 'setCalibrationSize'; changes: Partial<Pick<WallCalibration, 'width' | 'height'>> & { unit?: LengthUnit } }
  | { type: 'addMarker'; point: Point; utility: UtilityType }
  | { type: 'addPathMarker'; points: Point[]; utility: UtilityType }
  | { type: 'addLineMarker'; start: Point; end: Point; utility: UtilityType }
  | { type: 'updateMarker'; id: string; changes: Partial<Omit<Marker, 'id'>> }
  | { type: 'moveMarker'; id: string; point: Point }
  | { type: 'translateMarker'; id: string; dx: number; dy: number }
  | { type: 'moveMarkerEndpoint'; id: string; endpoint: LineEndpoint; point: Point }
  | { type: 'removeMarker'; id: string }
  | { type: 'selectMarker'; id: string | null }

const newMarkerId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function newMarker(fields: Pick<Marker, 'kind' | 'x' | 'y' | 'x2' | 'y2'> & Partial<Pick<Marker, 'type' | 'points'>>): Marker {
  return {
    id: newMarkerId(),
    type: DEFAULT_MARKER_TYPE,
    points: null,
    measurement: '',
    reference_point: '',
    note: '',
    ...fields,
  }
}

/** Shift a run, stopping at the photo edge so it keeps its shape. */
function translateLine(marker: Marker, dx: number, dy: number): Marker {
  if (marker.kind === 'path' && marker.points) {
    const xs = marker.points.map((p) => p.x)
    const ys = marker.points.map((p) => p.y)
    const safeDx = Math.min(Math.max(dx, -Math.min(...xs)), 1 - Math.max(...xs))
    const safeDy = Math.min(Math.max(dy, -Math.min(...ys)), 1 - Math.max(...ys))
    const points = marker.points.map((p) => ({ x: p.x + safeDx, y: p.y + safeDy }))
    const first = points[0]!
    const last = points[points.length - 1]!
    return { ...marker, points, x: first.x, y: first.y, x2: last.x, y2: last.y }
  }
  if (marker.x2 === null || marker.y2 === null) return marker
  const minX = Math.min(marker.x, marker.x2)
  const maxX = Math.max(marker.x, marker.x2)
  const minY = Math.min(marker.y, marker.y2)
  const maxY = Math.max(marker.y, marker.y2)
  const safeDx = Math.min(Math.max(dx, -minX), 1 - maxX)
  const safeDy = Math.min(Math.max(dy, -minY), 1 - maxY)
  return { ...marker, x: marker.x + safeDx, y: marker.y + safeDy, x2: marker.x2 + safeDx, y2: marker.y2 + safeDy }
}

export function draftReducer(draft: WallDraft, action: DraftAction): WallDraft {
  switch (action.type) {
    case 'setPhoto':
      return {
        ...draft,
        photo: action.photo,
        coverage: draft.coverage === 'none' ? 'full' : draft.coverage,
      }
    case 'clearPhoto':
      return {
        ...draft,
        photo: null,
        coverage: 'none',
        uncoveredRegion: null,
        calibration: null,
        markers: [],
        selectedMarkerId: null,
      }
    case 'setField':
      return {
        ...draft,
        [action.field]: action.value,
        // A different email needs its own decision about inviting.
        ...(action.field === 'homeownerEmail' ? { inviteHomeowner: false } : {}),
      }
    case 'setInvite':
      return { ...draft, inviteHomeowner: action.invite }
    case 'setCoverage':
      return {
        ...draft,
        coverage: action.coverage,
        uncoveredRegion:
          action.coverage === 'partial' ? (draft.uncoveredRegion ?? DEFAULT_REGION) : null,
        markers: action.coverage === 'none' ? [] : draft.markers,
      }
    case 'setRegion':
      return { ...draft, uncoveredRegion: action.region }
    case 'setCalibration':
      return { ...draft, calibration: action.calibration }
    case 'moveCalibrationCorner': {
      const current = draft.calibration ?? DEFAULT_CALIBRATION
      return {
        ...draft,
        calibration: { ...current, [action.corner]: { x: clamp01(action.point.x), y: clamp01(action.point.y) } },
      }
    }
    case 'setCalibrationSize': {
      const current = draft.calibration ?? DEFAULT_CALIBRATION
      return { ...draft, calibration: { ...current, ...action.changes } }
    }
    case 'addMarker': {
      const marker = newMarker({
        kind: 'point',
        type: action.utility,
        x: action.point.x,
        y: action.point.y,
        x2: null,
        y2: null,
      })
      return { ...draft, markers: [...draft.markers, marker], selectedMarkerId: marker.id }
    }
    case 'addPathMarker': {
      if (action.points.length < 2) return draft
      const points = action.points.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) }))
      const first = points[0]!
      const last = points[points.length - 1]!
      const marker = newMarker({
        kind: 'path',
        type: action.utility,
        points,
        x: first.x,
        y: first.y,
        x2: last.x,
        y2: last.y,
      })
      // Not selected, so the details sheet doesn't cover the photo: the tradesperson
      // first sees where the run snapped, then taps its number to add details.
      return { ...draft, markers: [...draft.markers, marker], selectedMarkerId: null }
    }
    case 'addLineMarker': {
      const marker = newMarker({
        kind: 'line',
        type: action.utility,
        x: clamp01(action.start.x),
        y: clamp01(action.start.y),
        x2: clamp01(action.end.x),
        y2: clamp01(action.end.y),
      })
      // Like a drawn run: not selected, so the sheet doesn't cover the photo.
      return { ...draft, markers: [...draft.markers, marker], selectedMarkerId: null }
    }
    case 'updateMarker':
      return {
        ...draft,
        markers: draft.markers.map((m) => (m.id === action.id ? { ...m, ...action.changes } : m)),
      }
    case 'moveMarker':
      return {
        ...draft,
        markers: draft.markers.map((m) =>
          m.id === action.id ? { ...m, x: action.point.x, y: action.point.y } : m,
        ),
      }
    case 'translateMarker':
      return {
        ...draft,
        markers: draft.markers.map((m) => (m.id === action.id ? translateLine(m, action.dx, action.dy) : m)),
      }
    case 'moveMarkerEndpoint':
      return {
        ...draft,
        markers: draft.markers.map((m) => {
          if (m.id !== action.id) return m
          return action.endpoint === 'start'
            ? { ...m, x: action.point.x, y: action.point.y }
            : { ...m, x2: action.point.x, y2: action.point.y }
        }),
      }
    case 'removeMarker':
      return {
        ...draft,
        markers: draft.markers.filter((m) => m.id !== action.id),
        selectedMarkerId: draft.selectedMarkerId === action.id ? null : draft.selectedMarkerId,
      }
    case 'selectMarker':
      return { ...draft, selectedMarkerId: action.id }
  }
}
