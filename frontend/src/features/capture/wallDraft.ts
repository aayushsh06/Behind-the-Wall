/** Client-side draft of a wall record and the pure reducer that edits it. */

import type { Point } from '@/components/photo'
import type { Coverage, Marker, Region, UtilityType, Wall, WallCalibration, WallInput } from '@/domain/types'
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
  selectedMarkerId: string | null
}

export const DEFAULT_REGION: Region = { x: 0, y: 0, width: 1, height: 0.5 }
export const DEFAULT_MARKER_TYPE: UtilityType = 'pipe'

export function emptyDraft(author = ''): WallDraft {
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
  }
}

type TextField = 'room' | 'label' | 'author' | 'observedDate' | 'coverageNote' | 'notes'

export type DraftAction =
  | { type: 'setPhoto'; photo: DraftPhoto }
  | { type: 'clearPhoto' }
  | { type: 'setField'; field: TextField; value: string }
  | { type: 'setCoverage'; coverage: Coverage }
  | { type: 'setRegion'; region: Region }
  | { type: 'addMarker'; point: Point }
  | { type: 'updateMarker'; id: string; changes: Partial<Omit<Marker, 'id'>> }
  | { type: 'moveMarker'; id: string; point: Point }
  | { type: 'removeMarker'; id: string }
  | { type: 'selectMarker'; id: string | null }

const newMarkerId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

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
      return { ...draft, [action.field]: action.value }
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
    case 'addMarker': {
      const marker: Marker = {
        id: newMarkerId(),
        type: DEFAULT_MARKER_TYPE,
        kind: 'point',
        x: action.point.x,
        y: action.point.y,
        x2: null,
        y2: null,
        measurement: '',
        reference_point: '',
        note: '',
      }
      return { ...draft, markers: [...draft.markers, marker], selectedMarkerId: marker.id }
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
