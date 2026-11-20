import type { Tone } from '@/domain/coverage'
import { cn } from '@/lib/cn'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-white/95 text-green-800',
  warning: 'bg-white/95 text-amber-800',
  danger: 'bg-white/95 text-red-800',
}

const DOT_CLASSES: Record<Tone, string> = {
  success: 'bg-green-600',
  warning: 'bg-brand',
  danger: 'bg-red-600',
}

interface ChipProps {
  tone: Tone
  children: string
  className?: string
}

/** Pill with a status dot; readable on white cards and on photos. */
export function Chip({ tone, children, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-line',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', DOT_CLASSES[tone])} />
      {children}
    </span>
  )
}
