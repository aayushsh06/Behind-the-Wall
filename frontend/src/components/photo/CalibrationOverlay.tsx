import type { Point } from '@/components/photo/coordinates'
import { Handle } from '@/components/photo/Handle'
import { describeWallSize } from '@/domain/geometry'
import type { WallCalibration } from '@/domain/types'
import { formatLength } from '@/domain/geometry'

export type CalibrationCorner = 'top_left' | 'bottom_right'

interface CalibrationOverlayProps {
  calibration: WallCalibration
  editable?: boolean
  surfaceRef: React.RefObject<HTMLElement | null>
  onMoveCorner?: (corner: CalibrationCorner, point: Point) => void
}

/** Dashed outline of the calibrated wall area with its real dimensions, plus corner handles when editing. */
export function CalibrationOverlay({ calibration, editable, surfaceRef, onMoveCorner }: CalibrationOverlayProps) {
  const { top_left: tl, bottom_right: br } = calibration
  const valid = br.x > tl.x && br.y > tl.y

  return (
    <>
      {valid ? (
        <div
          aria-label={`Wall ${describeWallSize(calibration)}`}
          className="pointer-events-none absolute border-2 border-dashed border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{
            left: `${tl.x * 100}%`,
            top: `${tl.y * 100}%`,
            width: `${(br.x - tl.x) * 100}%`,
            height: `${(br.y - tl.y) * 100}%`,
          }}
        >
          <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded bg-stone-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            ↔ {formatLength(calibration.width, calibration.unit)}
          </span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-stone-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            ↕ {formatLength(calibration.height, calibration.unit)}
          </span>
        </div>
      ) : null}
      {editable && onMoveCorner ? (
        <>
          <Handle label="Top-left corner of wall" position={tl} surfaceRef={surfaceRef} onMove={(p) => onMoveCorner('top_left', p)} />
          <Handle label="Bottom-right corner of wall" position={br} surfaceRef={surfaceRef} onMove={(p) => onMoveCorner('bottom_right', p)} />
        </>
      ) : null}
    </>
  )
}
