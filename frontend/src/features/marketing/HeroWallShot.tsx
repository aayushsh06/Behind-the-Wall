import { UTILITY_META } from '@/domain/utility'
import { LEGEND } from '@/features/marketing/legend'
import { cn } from '@/lib/cn'

/**
 * The product, shown on a real wall photo: numbered pins and runs for what is inside,
 * and the hatched area nobody inspected. Coordinates are fractions of the photo.
 */
const WATER = UTILITY_META.water.hex
const PIPE = UTILITY_META.pipe.hex
const WIRE = UTILITY_META.wire.hex
const FRAMING = UTILITY_META.framing.hex

const RUNS = [
  { color: PIPE, from: [0.305, 0.06], to: [0.305, 0.82] },
  { color: WIRE, from: [0.435, 0.42], to: [0.72, 0.42] },
  { color: FRAMING, from: [0.425, 0.21], to: [0.425, 0.84] },
] as const

const PINS = [
  { n: 1, color: PIPE, x: 0.305, y: 0.3, label: 'Drain' },
  { n: 2, color: WATER, x: 0.372, y: 0.44, label: 'Supply' },
  { n: 3, color: WIRE, x: 0.55, y: 0.42, label: '12/2 NM' },
  { n: 4, color: WIRE, x: 0.622, y: 0.3, label: 'Box' },
  { n: 5, color: FRAMING, x: 0.425, y: 0.7, label: 'Stud' },
] as const

const UNINSPECTED = { x: 0.745, y: 0.22, w: 0.255, h: 0.46 }

interface HeroWallShotProps {
  /** Hide the floating cards (used in narrow panels). */
  compact?: boolean
  className?: string
}

export function HeroWallShot({ compact = false, className }: HeroWallShotProps) {
  return (
    <figure className={cn('relative', className)}>
      <div className="relative aspect-[1024/559] overflow-hidden rounded-[28px] bg-surface-3 ring-1 ring-inset ring-black/5">
        <img
          src="/images/wall-kitchen.jpg"
          alt="An open kitchen wall with pipes, wiring, and studs marked up in Behind the Wall"
          className="absolute inset-0 size-full object-cover"
          loading="eager"
        />
        <div
          className="absolute flex items-center justify-center border-2 border-brand bg-amber-200/25"
          style={{
            left: `${UNINSPECTED.x * 100}%`,
            top: `${UNINSPECTED.y * 100}%`,
            width: `${UNINSPECTED.w * 100}%`,
            height: `${UNINSPECTED.h * 100}%`,
          }}
        >
          <span aria-hidden="true" className="hatch absolute inset-0 opacity-80" />
          <span className="eyebrow relative rounded bg-ink px-2 py-1 text-[10px] text-white">Not inspected</span>
        </div>
        <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {RUNS.map((run) => (
            <g key={`${run.from}-${run.to}`}>
              <line
                x1={run.from[0] * 100} y1={run.from[1] * 100} x2={run.to[0] * 100} y2={run.to[1] * 100}
                stroke="#fff" strokeWidth={7} strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={0.9}
              />
              <line
                x1={run.from[0] * 100} y1={run.from[1] * 100} x2={run.to[0] * 100} y2={run.to[1] * 100}
                stroke={run.color} strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
        {PINS.map((pin) => (
          <span
            key={pin.n}
            className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md sm:size-8"
            style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%`, backgroundColor: pin.color }}
            title={pin.label}
          >
            {pin.n}
          </span>
        ))}
        {/* Dimension line along the bottom edge, as on a drawing. */}
        <div className="absolute inset-x-[4%] bottom-[5%] hidden items-center gap-2 text-white sm:flex" aria-hidden="true">
          <span className="h-3 w-px bg-white/80" />
          <span className="h-px flex-1 bg-white/80" />
          <span className="eyebrow rounded bg-ink/80 px-2 py-0.5 text-[10px]">Wall 8 ft 4 in</span>
          <span className="h-px flex-1 bg-white/80" />
          <span className="h-3 w-px bg-white/80" />
        </div>
      </div>

      {compact ? null : (
        <>
          <div className="absolute -bottom-8 left-4 w-[min(300px,70%)] rounded-2xl bg-surface p-4 shadow-lift ring-1 ring-inset ring-line sm:-bottom-10 sm:left-8 sm:p-5">
            <p className="eyebrow text-fg-faint">Kitchen — Wall behind sink</p>
            <p className="mt-1.5 text-base font-semibold tracking-tight sm:text-lg">5 items recorded</p>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
              {LEGEND.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                  <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="absolute -top-4 right-4 hidden items-center gap-2.5 rounded-full bg-surface py-2 pl-2 pr-4 shadow-lift ring-1 ring-inset ring-line sm:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-ink text-white">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 1.5h5l3 3v10H4z M9 1.5v3h3" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold">PDF · Revision 2</span>
          </div>
        </>
      )}
    </figure>
  )
}
