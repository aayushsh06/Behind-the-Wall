import type { ReactNode } from 'react'

import type { Tone } from '@/domain/coverage'
import { cn } from '@/lib/cn'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-green-50 text-green-900 border-green-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-red-50 text-red-900 border-red-200',
}

interface BannerProps {
  tone: Tone
  title: string
  children?: ReactNode
}

export function Banner({ tone, title, children }: BannerProps) {
  return (
    <div role="status" className={cn('rounded-xl border px-3 py-2.5 text-sm', TONE_CLASSES[tone])}>
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-[13px] opacity-90">{children}</div> : null}
    </div>
  )
}
