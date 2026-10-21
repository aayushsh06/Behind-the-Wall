import type { Region } from '@/domain/types'

interface UncoveredRegionOverlayProps {
  region: Region
}

const HATCH =
  'repeating-linear-gradient(45deg, rgba(180,83,9,0.55) 0 3px, rgba(255,200,80,0.25) 3px 10px)'

/** Visibly marks the part of the photo that was not inspected so blank never reads as safe. */
export function UncoveredRegionOverlay({ region }: UncoveredRegionOverlayProps) {
  return (
    <div
      aria-label="Not inspected area"
      className="pointer-events-none absolute flex items-center justify-center border-2 border-amber-700"
      style={{
        left: `${region.x * 100}%`,
        top: `${region.y * 100}%`,
        width: `${region.width * 100}%`,
        height: `${region.height * 100}%`,
        backgroundImage: HATCH,
      }}
    >
      <span className="rounded bg-amber-700 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
        NOT INSPECTED
      </span>
    </div>
  )
}
