import type { ReactNode } from 'react'

interface SectionHeadingProps {
  children: ReactNode
  aside?: ReactNode
  id?: string
}

/** Small label used above lists and cards. */
export function SectionHeading({ children, aside, id }: SectionHeadingProps) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-sm font-semibold text-fg">
        {children}
      </h2>
      {aside ? <span className="text-sm text-fg-faint">{aside}</span> : null}
    </div>
  )
}
