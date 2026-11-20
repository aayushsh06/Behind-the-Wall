import { useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, ReactNode } from 'react'

import type { CalibrationCorner } from '@/components/photo/CalibrationOverlay'
import { CalibrationOverlay } from '@/components/photo/CalibrationOverlay'
import type { Bounds } from '@/components/photo/bounds'
import { clampToBounds, insideBounds, strokeLength } from '@/components/photo/bounds'
import type { Point } from '@/components/photo/coordinates'
import { toNormalizedPoint, toPercentStyle } from '@/components/photo/coordinates'
import { Handle } from '@/components/photo/Handle'
import { LineLayer } from '@/components/photo/LineLayer'
import { MarkerPin } from '@/components/photo/MarkerPin'
import { UncoveredRegionOverlay } from '@/components/photo/UncoveredRegionOverlay'
import { pathMidpoint } from '@/domain/geometry'
import type { MarkerKind, Region, UtilityType, WallCalibration } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'
import { cn } from '@/lib/cn'

export interface CanvasMarker {
  id: string
  type: UtilityType
  kind: MarkerKind
  x: number
  y: number
  x2: number | null
  y2: number | null
  points?: Point[] | null
}

export type LineEndpoint = 'start' | 'end'

interface PhotoCanvasProps {
  src: string
  alt: string
  /** width / height of the photo so the box is sized before the image loads. */
  aspectRatio: number
  markers: CanvasMarker[]
  uncoveredRegion?: Region | null
  calibration?: WallCalibration | null
  selectedMarkerId?: string | null
  /** Start of a line currently being drawn (shown as a dot until the second tap). */
  pendingLineStart?: Point | null
  editable?: boolean
  calibrationEditable?: boolean
  /** Freehand drawing: the colour of the stroke while drawing. Set to enable drawing. */
  drawColor?: string | null
  /** Called with the finished stroke (normalized points) when the finger lifts. */
  onDrawComplete?: (points: Point[]) => void
  /** A two-finger zoom is in progress: drop any stroke and ignore taps until it ends. */
  gestureActive?: boolean
  /** Strokes and taps outside this area are ignored; strokes are kept inside it. */
  drawBounds?: Bounds | null
  /** Whether pins can be dragged (selecting by tap always works). Defaults to editable. */
  pinsDraggable?: boolean
  /** Shade the photo outside the wall frame to show where marks can go. */
  dimOutsideFrame?: boolean
  onSelectMarker?: (id: string) => void
  onPlace?: (point: Point) => void
  onMoveMarker?: (id: string, point: Point) => void
  onTranslateMarker?: (id: string, dx: number, dy: number) => void
  onMoveMarkerEndpoint?: (id: string, endpoint: LineEndpoint, point: Point) => void
  onMoveCalibrationCorner?: (corner: CalibrationCorner, point: Point) => void
  children?: ReactNode
}

/** Where a marker's numbered badge sits: the point itself, or the middle of its run. */
function badgePosition(m: CanvasMarker): Point {
  if (m.kind === 'path' && m.points && m.points.length > 1) return pathMidpoint(m.points)
  if (m.kind === 'line') return { x: (m.x + (m.x2 ?? m.x)) / 2, y: (m.y + (m.y2 ?? m.y)) / 2 }
  return m
}

function runPoints(m: CanvasMarker): Point[] | null {
  if (m.kind === 'path' && m.points && m.points.length > 1) return m.points
  if (m.kind === 'line' && m.x2 !== null && m.y2 !== null) return [{ x: m.x, y: m.y }, { x: m.x2, y: m.y2 }]
  return null
}

/** Ignore pointer jitter smaller than this (normalized) while drawing. */
const MIN_STROKE_STEP = 0.003
/** A stroke shorter than this (normalized) is a stray touch, not a run. */
const MIN_STROKE_LENGTH = 0.04

/**
 * Renders a photo at full width with markers positioned in normalized coordinates,
 * so the same component serves capture (editable) and find (read-only) screens and
 * markers land in the same place on any screen size.
 */
export function PhotoCanvas({
  src,
  alt,
  aspectRatio,
  markers,
  uncoveredRegion,
  calibration,
  selectedMarkerId,
  pendingLineStart,
  editable = false,
  calibrationEditable = false,
  drawColor = null,
  onDrawComplete,
  gestureActive = false,
  drawBounds = null,
  pinsDraggable,
  dimOutsideFrame = false,
  onSelectMarker,
  onPlace,
  onMoveMarker,
  onTranslateMarker,
  onMoveMarkerEndpoint,
  onMoveCalibrationCorner,
  children,
}: PhotoCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [stroke, setStroke] = useState<Point[] | null>(null)
  const drawing = Boolean(editable && drawColor && onDrawComplete)
  // A pinch that starts mid-stroke cancels the stroke (adjusting state during render).
  if (gestureActive && stroke) setStroke(null)

  const handleSurfaceClick = (event: MouseEvent<HTMLDivElement>) => {
    if (gestureActive || drawing || !editable || !onPlace || !surfaceRef.current) return
    const point = toNormalizedPoint(surfaceRef.current, event.clientX, event.clientY)
    if (drawBounds && !insideBounds(point, drawBounds)) return
    onPlace(point)
  }

  const pointAt = (event: PointerEvent<HTMLDivElement>) =>
    toNormalizedPoint(surfaceRef.current!, event.clientX, event.clientY)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!drawing || gestureActive || !surfaceRef.current) return
    const start = pointAt(event)
    // Only start a run inside the wall frame.
    if (drawBounds && !insideBounds(start, drawBounds)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setStroke([start])
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!stroke || gestureActive || !surfaceRef.current) return
    const raw = pointAt(event)
    const next = drawBounds ? clampToBounds(raw, drawBounds) : raw
    const last = stroke[stroke.length - 1]!
    if (Math.hypot(next.x - last.x, next.y - last.y) < MIN_STROKE_STEP) return
    setStroke([...stroke, next])
  }

  const finishStroke = () => {
    if (!stroke || gestureActive) return
    const done = stroke
    setStroke(null)
    if (done.length > 1 && strokeLength(done) >= MIN_STROKE_LENGTH) onDrawComplete?.(done)
  }

  const lines = markers.flatMap((m) => {
    const points = runPoints(m)
    return points ? [{ id: m.id, type: m.type, points, selected: m.id === selectedMarkerId }] : []
  })
  const selectedLine = editable ? markers.find((m) => m.id === selectedMarkerId && m.kind === 'line') : undefined

  return (
    <div
      ref={surfaceRef}
      onClick={handleSurfaceClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={() => setStroke(null)}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-line select-none',
        editable && !drawing && 'cursor-crosshair',
      )}
      style={{ aspectRatio }}
    >
      <img src={src} alt={alt} draggable={false} className="block h-full w-full object-cover" />
      {uncoveredRegion ? <UncoveredRegionOverlay region={uncoveredRegion} /> : null}
      {calibration ? (
        <CalibrationOverlay
          calibration={calibration}
          editable={calibrationEditable}
          dimOutside={dimOutsideFrame}
          surfaceRef={surfaceRef}
          onMoveCorner={onMoveCalibrationCorner}
        />
      ) : null}
      {drawing ? (
        // Only a finger that lands inside the wall frame draws; anywhere else on the photo
        // it scrolls the page as usual (see ZoomViewport).
        <div
          data-draw-zone=""
          className="absolute cursor-crosshair touch-none"
          style={
            drawBounds
              ? {
                  left: `${drawBounds.x0 * 100}%`,
                  top: `${drawBounds.y0 * 100}%`,
                  width: `${(drawBounds.x1 - drawBounds.x0) * 100}%`,
                  height: `${(drawBounds.y1 - drawBounds.y0) * 100}%`,
                }
              : { inset: 0 }
          }
        />
      ) : null}
      <LineLayer lines={lines} liveStroke={stroke && drawColor ? { points: stroke, color: drawColor } : null} />
      {pendingLineStart ? (
        <span
          aria-label="Line start"
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow"
          style={toPercentStyle(pendingLineStart)}
        />
      ) : null}
      {markers.map((marker, index) => {
        const isRun = marker.kind !== 'point'
        return (
          <MarkerPin
            key={marker.id}
            index={index + 1}
            type={marker.type}
            position={badgePosition(marker)}
            selected={marker.id === selectedMarkerId}
            draggable={pinsDraggable ?? editable}
            surfaceRef={surfaceRef}
            onSelect={() => onSelectMarker?.(marker.id)}
            onMove={(point, previous) =>
              isRun
                ? onTranslateMarker?.(marker.id, point.x - previous.x, point.y - previous.y)
                : onMoveMarker?.(marker.id, point)
            }
          />
        )
      })}
      {selectedLine && selectedLine.x2 !== null && selectedLine.y2 !== null ? (
        <>
          <Handle
            label="Line start"
            color={UTILITY_META[selectedLine.type].hex}
            position={{ x: selectedLine.x, y: selectedLine.y }}
            surfaceRef={surfaceRef}
            onMove={(p) => onMoveMarkerEndpoint?.(selectedLine.id, 'start', p)}
          />
          <Handle
            label="Line end"
            color={UTILITY_META[selectedLine.type].hex}
            position={{ x: selectedLine.x2, y: selectedLine.y2 }}
            surfaceRef={surfaceRef}
            onMove={(p) => onMoveMarkerEndpoint?.(selectedLine.id, 'end', p)}
          />
        </>
      ) : null}
      {children}
    </div>
  )
}
