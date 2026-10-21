import { useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'

import type { CalibrationCorner } from '@/components/photo/CalibrationOverlay'
import { CalibrationOverlay } from '@/components/photo/CalibrationOverlay'
import type { Point } from '@/components/photo/coordinates'
import { toNormalizedPoint, toPercentStyle } from '@/components/photo/coordinates'
import { Handle } from '@/components/photo/Handle'
import { LineLayer } from '@/components/photo/LineLayer'
import { MarkerPin } from '@/components/photo/MarkerPin'
import { UncoveredRegionOverlay } from '@/components/photo/UncoveredRegionOverlay'
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
  onSelectMarker?: (id: string) => void
  onPlace?: (point: Point) => void
  onMoveMarker?: (id: string, point: Point) => void
  onTranslateMarker?: (id: string, dx: number, dy: number) => void
  onMoveMarkerEndpoint?: (id: string, endpoint: LineEndpoint, point: Point) => void
  onMoveCalibrationCorner?: (corner: CalibrationCorner, point: Point) => void
  children?: ReactNode
}

const midpoint = (m: CanvasMarker): Point => ({
  x: (m.x + (m.x2 ?? m.x)) / 2,
  y: (m.y + (m.y2 ?? m.y)) / 2,
})

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
  onSelectMarker,
  onPlace,
  onMoveMarker,
  onTranslateMarker,
  onMoveMarkerEndpoint,
  onMoveCalibrationCorner,
  children,
}: PhotoCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)

  const handleSurfaceClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!editable || !onPlace || !surfaceRef.current) return
    onPlace(toNormalizedPoint(surfaceRef.current, event.clientX, event.clientY))
  }

  const lines = markers
    .filter((m) => m.kind === 'line' && m.x2 !== null && m.y2 !== null)
    .map((m) => ({
      id: m.id,
      type: m.type,
      start: { x: m.x, y: m.y },
      end: { x: m.x2!, y: m.y2! },
      selected: m.id === selectedMarkerId,
    }))
  const selectedLine = editable ? markers.find((m) => m.id === selectedMarkerId && m.kind === 'line') : undefined

  return (
    <div
      ref={surfaceRef}
      onClick={handleSurfaceClick}
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-stone-200 select-none',
        editable && 'cursor-crosshair',
      )}
      style={{ aspectRatio }}
    >
      <img src={src} alt={alt} draggable={false} className="block h-full w-full object-cover" />
      {uncoveredRegion ? <UncoveredRegionOverlay region={uncoveredRegion} /> : null}
      {calibration ? (
        <CalibrationOverlay
          calibration={calibration}
          editable={calibrationEditable}
          surfaceRef={surfaceRef}
          onMoveCorner={onMoveCalibrationCorner}
        />
      ) : null}
      <LineLayer lines={lines} />
      {pendingLineStart ? (
        <span
          aria-label="Line start"
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-stone-900 shadow"
          style={toPercentStyle(pendingLineStart)}
        />
      ) : null}
      {markers.map((marker, index) => {
        const isLine = marker.kind === 'line'
        return (
          <MarkerPin
            key={marker.id}
            index={index + 1}
            type={marker.type}
            position={isLine ? midpoint(marker) : marker}
            selected={marker.id === selectedMarkerId}
            draggable={editable}
            surfaceRef={surfaceRef}
            onSelect={() => onSelectMarker?.(marker.id)}
            onMove={(point, previous) =>
              isLine
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
