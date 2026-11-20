import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Small mono label above the title. */
  eyebrow?: string
  backTo?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, eyebrow, backTo, action }: PageHeaderProps) {
  return (
    <header className="mb-8 flex items-start gap-3">
      {backTo ? (
        <Link
          to={backTo}
          aria-label="Back"
          className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-fg-muted ring-1 ring-inset ring-line transition-colors hover:text-fg hover:ring-line-strong"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="eyebrow mb-2 text-fg-faint">{eyebrow}</p> : null}
        <h1 className="truncate text-[28px] font-semibold leading-tight tracking-[-0.02em] md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[15px] text-fg-muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  )
}
