import type { Point } from '@/components/photo/coordinates'
import type { UtilityType } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'

export interface LineSegment {
  id: string
  type: UtilityType
  start: Point
  end: Point
  selected?: boolean
}

interface LineLayerProps {
  lines: LineSegment[]
}

/**
 * Draws all line markers in one SVG that exactly covers the photo. Stroke widths use
 * non-scaling strokes so lines stay the same thickness at any photo size.
 */
export function LineLayer({ lines }: LineLayerProps) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {lines.map((line) => (
        <g key={line.id}>
          <line
            x1={line.start.x * 100}
            y1={line.start.y * 100}
            x2={line.end.x * 100}
            y2={line.end.y * 100}
            stroke="#fff"
            strokeWidth={line.selected ? 9 : 7}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.9}
          />
          <line
            x1={line.start.x * 100}
            y1={line.start.y * 100}
            x2={line.end.x * 100}
            y2={line.end.y * 100}
            stroke={UTILITY_META[line.type].hex}
            strokeWidth={line.selected ? 5 : 4}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  )
}
