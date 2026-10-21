import type { Tone } from '@/domain/coverage'
import { cn } from '@/lib/cn'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
}

interface ChipProps {
  tone: Tone
  children: string
}

export function Chip({ tone, children }: ChipProps) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', TONE_CLASSES[tone])}>
      {children}
    </span>
  )
}
