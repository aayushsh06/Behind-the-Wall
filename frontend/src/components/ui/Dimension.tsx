import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface DimensionProps {
  children: ReactNode
  aside?: ReactNode
  id?: string
  as?: 'h2' | 'h3' | 'p'
  className?: string
}

/**
 * A heading drawn like an architectural dimension line: |— LABEL ———— aside —|.
 * Used for room headings so lists read like a set of drawings.
 */
export function Dimension({ children, aside, id, as: Tag = 'h2', className }: DimensionProps) {
  return (
    <div className={cn('flex items-center gap-3 text-fg-muted', className)}>
      <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
      <Tag id={id} className="eyebrow shrink-0 text-fg">
        {children}
      </Tag>
      <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
      {aside ? <span className="eyebrow shrink-0 text-fg-faint">{aside}</span> : null}
      <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
    </div>
  )
}
