import type { Tone } from '@/domain/coverage'
import { cn } from '@/lib/cn'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  danger: 'bg-red-500/15 text-red-300 ring-red-500/30',
}

interface ChipProps {
  tone: Tone
  children: string
}

export function Chip({ tone, children }: ChipProps) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', TONE_CLASSES[tone])}>
      {children}
    </span>
  )
}
