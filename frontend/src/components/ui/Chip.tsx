import type { Tone } from '@/domain/coverage'
import { cn } from '@/lib/cn'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-green-50 text-green-800 ring-green-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
}

interface ChipProps {
  tone: Tone
  children: string
}

export function Chip({ tone, children }: ChipProps) {
  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONE_CLASSES[tone])}>
      {children}
    </span>
  )
}
