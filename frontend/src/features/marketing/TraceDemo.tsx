import { UTILITY_META } from '@/domain/utility'
import { SAMPLE_RUNS } from '@/features/marketing/sampleRuns'

/** The part of the kitchen photo shown, as fractions of the photo: x, y, width, height. */
const VIEW = { x: 0.31, y: 0.25, w: 0.27, h: 0.16 }
const run = SAMPLE_RUNS.find((r) => r.type === 'water')!
const toAttr = (points: readonly (readonly [number, number])[]) =>
  points.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')

/**
 * A close-up of one real trace: the rough line a finger drew (dashed) and where the app
 * snapped it (solid), on the curving supply line in the kitchen photo.
 */
export function TraceDemo() {
  const color = UTILITY_META[run.type].hex
  return (
    <figure>
      <div
        className="relative overflow-hidden rounded-[28px] bg-surface-3 ring-1 ring-inset ring-black/5"
        style={{ aspectRatio: `${VIEW.w * 1024} / ${VIEW.h * 559}` }}
      >
        <div
          className="absolute"
          style={{
            width: `${100 / VIEW.w}%`,
            height: `${100 / VIEW.h}%`,
            left: `${(-VIEW.x / VIEW.w) * 100}%`,
            top: `${(-VIEW.y / VIEW.h) * 100}%`,
          }}
        >
          <img src="/images/wall-kitchen.jpg" alt="" className="absolute inset-0 size-full object-cover" />
          <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={toAttr(run.stroke)} stroke="#fff" strokeWidth={3} strokeDasharray="7 6" vectorEffect="non-scaling-stroke" />
              <polyline points={toAttr(run.snapped)} stroke="#fff" strokeWidth={9} vectorEffect="non-scaling-stroke" opacity={0.9} />
              <polyline points={toAttr(run.snapped)} stroke={color} strokeWidth={5} vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
        </div>
      </div>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg-muted">
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" width="28" height="6"><line x1="2" y1="3" x2="26" y2="3" stroke="#6b7078" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" /></svg>
          Your trace
        </span>
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" width="28" height="6"><line x1="2" y1="3" x2="26" y2="3" stroke={color} strokeWidth="4" strokeLinecap="round" /></svg>
          Snapped to the supply line
        </span>
      </figcaption>
    </figure>
  )
}
