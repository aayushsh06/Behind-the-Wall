import type { ReactNode } from 'react'

interface SectionHeadingProps {
  children: ReactNode
  aside?: ReactNode
  id?: string
}

/** Small mono label used above lists and cards. */
export function SectionHeading({ children, aside, id }: SectionHeadingProps) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="eyebrow text-fg">
        {children}
      </h2>
      {aside ? <span className="text-sm text-fg-faint">{aside}</span> : null}
    </div>
  )
}
