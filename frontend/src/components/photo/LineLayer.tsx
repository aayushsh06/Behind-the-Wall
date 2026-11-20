import type { Point } from '@/components/photo/coordinates'
import type { UtilityType } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'

export interface LineSegment {
  id: string
  type: UtilityType
  /** A straight run from start to end, or a freehand route through every point. */
  points: Point[]
  selected?: boolean
}

interface LineLayerProps {
  lines: LineSegment[]
  /** A stroke being drawn right now, shown dashed until it is finished and snapped. */
  liveStroke?: { points: Point[]; color: string } | null
}

const toAttr = (points: Point[]) => points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')

/** Stroke width that stays the same on screen when the photo is zoomed (see ZoomViewport). */
const width = (px: number) => ({ strokeWidth: `calc(${px}px * var(--photo-unzoom, 1))` })

/**
 * Draws all runs in one SVG that exactly covers the photo. Stroke widths use
 * non-scaling strokes so lines stay the same thickness at any photo size.
 */
export function LineLayer({ lines, liveStroke }: LineLayerProps) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {lines.map((line) => (
        <g key={line.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline
            points={toAttr(line.points)}
            stroke="#fff"
            style={width(line.selected ? 9 : 7)}
            vectorEffect="non-scaling-stroke"
            opacity={0.9}
          />
          <polyline
            points={toAttr(line.points)}
            stroke={UTILITY_META[line.type].hex}
            style={width(line.selected ? 5 : 4)}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      {liveStroke && liveStroke.points.length > 1 ? (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={toAttr(liveStroke.points)} stroke="#fff" style={width(7)} vectorEffect="non-scaling-stroke" opacity={0.85} />
          <polyline
            points={toAttr(liveStroke.points)}
            stroke={liveStroke.color}
            style={width(4)}
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ) : null}
    </svg>
  )
}
