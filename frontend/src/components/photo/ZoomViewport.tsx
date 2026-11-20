import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'

import type { PinchStart, View, XY } from '@/components/photo/zoom'
import { IDENTITY, MAX_SCALE, pinchView, zoomAround } from '@/components/photo/zoom'
import { cn } from '@/lib/cn'

interface ZoomState {
  /** Current zoom (1 = whole photo). */
  zoom: number
  /** True while two fingers are on the photo; drawing and tapping should stand down. */
  pinching: boolean
}

interface ZoomViewportProps {
  /** One finger draws on the photo, so page scrolling must be off over it. */
  drawing?: boolean
  children: (state: ZoomState) => ReactNode
}

const STEP = 1.6

/**
 * Lets the tradesperson zoom into the photo to trace cables that run close together.
 * Two fingers pinch to zoom and drag to pan; one finger is left to the photo for drawing
 * and tapping. Buttons offer the same without a gesture. Children lay out at full size
 * and are scaled with a CSS transform, so positions measured on the photo (via its
 * bounding box) stay correct at any zoom. `--photo-unzoom` lets pins counter-scale.
 */
export function ZoomViewport({ drawing = false, children }: ZoomViewportProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>(IDENTITY)
  const [pinching, setPinching] = useState(false)
  const pointers = useRef(new Map<number, XY>())
  const pinch = useRef<PinchStart | null>(null)
  const zoomed = view.scale > 1

  // iOS Safari doesn't always honour touch-action, so also stop the browser's own touch
  // handling here: two fingers on the photo never zoom or scroll the page, and while
  // drawing or zoomed in, one finger belongs to the photo too (no page scroll, no
  // rubber-band bounce or edge swipe).
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const block = (event: TouchEvent) => {
      if (event.touches.length > 1 || drawing || zoomed) event.preventDefault()
    }
    element.addEventListener('touchstart', block, { passive: false })
    element.addEventListener('touchmove', block, { passive: false })
    return () => {
      element.removeEventListener('touchstart', block)
      element.removeEventListener('touchmove', block)
    }
  }, [drawing, zoomed])

  // While two fingers are down, keep the page itself from moving underneath.
  useEffect(() => {
    if (!pinching) return
    const { overflow, overscrollBehavior } = document.documentElement.style
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    return () => {
      document.documentElement.style.overflow = overflow
      document.documentElement.style.overscrollBehavior = overscrollBehavior
    }
  }, [pinching])

  const size = () => {
    const rect = ref.current?.getBoundingClientRect()
    return { width: rect?.width ?? 1, height: rect?.height ?? 1 }
  }
  const local = (event: PointerEvent): XY => {
    const rect = ref.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const twoFingers = () => {
    const [a, b] = [...pointers.current.values()] as [XY, XY]
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
  }

  // Capture phase: these run before the photo's own handlers, so a second finger can
  // take over before it draws anything.
  const onPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    pointers.current.set(event.pointerId, local(event))
    if (pointers.current.size === 2) {
      const { distance, midpoint } = twoFingers()
      pinch.current = { view, distance, midpoint }
      setPinching(true)
      event.stopPropagation()
    }
  }
  const onPointerMoveCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, local(event))
    if (pinch.current && pointers.current.size >= 2) {
      const { distance, midpoint } = twoFingers()
      setView(pinchView(pinch.current, distance, midpoint, size()))
      event.stopPropagation()
    }
  }
  const onPointerEndCapture = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    // Stay in "pinching" until every finger is up, so the last one can't start a stroke.
    if (pointers.current.size === 0 && pinching) setPinching(false)
  }

  const zoomBy = (factor: number) => {
    const { width, height } = size()
    setView((current) => zoomAround(current, factor, { x: width / 2, y: height / 2 }, { width, height }))
  }

  const contentStyle = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    transformOrigin: '0 0',
    '--photo-unzoom': String(1 / view.scale),
  } as CSSProperties

  return (
    <div className="relative">
      <div
        ref={ref}
        onPointerDownCapture={onPointerDownCapture}
        onPointerMoveCapture={onPointerMoveCapture}
        onPointerUpCapture={onPointerEndCapture}
        onPointerCancelCapture={onPointerEndCapture}
        className={cn('overflow-hidden overscroll-contain rounded-2xl', drawing || zoomed ? 'touch-none' : 'touch-pan-y')}
      >
        <div style={contentStyle}>{children({ zoom: view.scale, pinching })}</div>
      </div>
      <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-full bg-surface/95 shadow-lift ring-1 ring-line backdrop-blur">
        <ZoomButton label="Zoom in" disabled={view.scale >= MAX_SCALE} onClick={() => zoomBy(STEP)}>
          <path d="M8 3v10M3 8h10" />
        </ZoomButton>
        <ZoomButton label="Zoom out" disabled={view.scale <= 1} onClick={() => zoomBy(1 / STEP)}>
          <path d="M3 8h10" />
        </ZoomButton>
        {view.scale > 1 ? (
          <ZoomButton label="Show whole photo" onClick={() => setView(IDENTITY)}>
            <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" />
          </ZoomButton>
        ) : null}
      </div>
      {view.scale > 1 ? (
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white">
          {view.scale.toFixed(1)}× · two fingers to move
        </span>
      ) : null}
    </div>
  )
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 items-center justify-center text-fg transition-colors hover:bg-surface-2 disabled:opacity-35"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  )
}
