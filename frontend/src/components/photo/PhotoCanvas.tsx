import { useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'

import type { Point } from '@/components/photo/coordinates'
import { toNormalizedPoint } from '@/components/photo/coordinates'
import { MarkerPin } from '@/components/photo/MarkerPin'
import { UncoveredRegionOverlay } from '@/components/photo/UncoveredRegionOverlay'
import type { Region, UtilityType } from '@/domain/types'
import { cn } from '@/lib/cn'

export interface CanvasMarker {
  id: string
  type: UtilityType
  x: number
  y: number
}

interface PhotoCanvasProps {
  src: string
  alt: string
  /** width / height of the photo so the box is sized before the image loads. */
  aspectRatio: number
  markers: CanvasMarker[]
  uncoveredRegion?: Region | null
  selectedMarkerId?: string | null
  editable?: boolean
  onSelectMarker?: (id: string) => void
  onPlace?: (point: Point) => void
  onMoveMarker?: (id: string, point: Point) => void
  children?: ReactNode
}

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
  selectedMarkerId,
  editable = false,
  onSelectMarker,
  onPlace,
  onMoveMarker,
  children,
}: PhotoCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)

  const handleSurfaceClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!editable || !onPlace || !surfaceRef.current) return
    onPlace(toNormalizedPoint(surfaceRef.current, event.clientX, event.clientY))
  }

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
      {markers.map((marker, index) => (
        <MarkerPin
          key={marker.id}
          index={index + 1}
          type={marker.type}
          position={marker}
          selected={marker.id === selectedMarkerId}
          draggable={editable}
          surfaceRef={surfaceRef}
          onSelect={() => onSelectMarker?.(marker.id)}
          onMove={(point) => onMoveMarker?.(marker.id, point)}
        />
      ))}
      {children}
    </div>
  )
}
