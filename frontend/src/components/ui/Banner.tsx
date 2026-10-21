import type { ReactNode } from 'react'

import type { Tone } from '@/domain/coverage'
import { cn } from '@/lib/cn'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200',
  warning: 'bg-amber-500/10 border-amber-500/25 text-amber-200',
  danger: 'bg-red-500/10 border-red-500/25 text-red-200',
}

const DOT_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
}

interface BannerProps {
  tone: Tone
  title: string
  children?: ReactNode
}

export function Banner({ tone, title, children }: BannerProps) {
  return (
    <div role="status" className={cn('flex gap-3 rounded-xl border px-3.5 py-3 text-sm', TONE_CLASSES[tone])}>
      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT_CLASSES[tone])} />
      <div>
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 text-[13px] opacity-80">{children}</div> : null}
      </div>
    </div>
  )
}
