import type { ReactNode } from 'react'

import type { Tone } from '@/domain/coverage'
import { cn } from '@/lib/cn'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-green-50 border-green-200 border-l-green-600 text-green-900',
  warning: 'bg-amber-50 border-amber-200 border-l-amber-500 text-amber-900',
  danger: 'bg-red-50 border-red-200 border-l-red-600 text-red-900',
}

interface BannerProps {
  tone: Tone
  title: string
  children?: ReactNode
}

export function Banner({ tone, title, children }: BannerProps) {
  return (
    <div role="status" className={cn('rounded-md border border-l-4 px-4 py-3 text-sm', TONE_CLASSES[tone])}>
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 opacity-90">{children}</div> : null}
    </div>
  )
}
