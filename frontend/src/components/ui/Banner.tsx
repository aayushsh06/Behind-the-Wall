import type { ReactNode } from 'react'

import type { Tone } from '@/domain/coverage'
import { cn } from '@/lib/cn'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-green-50 text-green-950 ring-green-200',
  warning: 'bg-brand-soft text-amber-950 ring-amber-200',
  danger: 'bg-red-50 text-red-950 ring-red-200',
}

const BAR_CLASSES: Record<Tone, string> = {
  success: 'bg-green-600',
  warning: 'hatch bg-amber-100',
  danger: 'bg-red-600',
}

interface BannerProps {
  tone: Tone
  title: string
  children?: ReactNode
}

export function Banner({ tone, title, children }: BannerProps) {
  return (
    <div role="status" className={cn('flex overflow-hidden rounded-xl text-sm ring-1 ring-inset', TONE_CLASSES[tone])}>
      <span aria-hidden="true" className={cn('w-1.5 shrink-0', BAR_CLASSES[tone], tone === 'warning' && 'w-3')} />
      <div className="px-4 py-3">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 opacity-90">{children}</div> : null}
      </div>
    </div>
  )
}
