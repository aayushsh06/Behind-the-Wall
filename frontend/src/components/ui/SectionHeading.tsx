import type { ReactNode } from 'react'

interface SectionHeadingProps {
  children: ReactNode
  aside?: ReactNode
  id?: string
}

/** Small uppercase label used above lists and cards. */
export function SectionHeading({ children, aside, id }: SectionHeadingProps) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-faint">
        {children}
      </h2>
      {aside ? <span className="text-xs text-fg-faint">{aside}</span> : null}
    </div>
  )
}
