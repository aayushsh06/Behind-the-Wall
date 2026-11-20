import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Small label above the title. */
  eyebrow?: string
  backTo?: string
  /** Where the back link goes, in words (e.g. "Demo Homeowner"). Defaults to "Back". */
  backLabel?: string
  action?: ReactNode
}

/**
 * Page title block. The back link sits above the title, so the title has the full width
 * and long names wrap instead of being cut off.
 */
export function PageHeader({ title, subtitle, eyebrow, backTo, backLabel = 'Back', action }: PageHeaderProps) {
  return (
    <header className="mb-8">
      {backTo ? (
        <Link
          to={backTo}
          aria-label={backLabel === 'Back' ? 'Back' : `Back to ${backLabel}`}
          className="-ml-1 mb-4 inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{backLabel}</span>
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-80">
          {eyebrow ? <p className="eyebrow mb-2 text-fg-faint">{eyebrow}</p> : null}
          <h1 className="break-words text-[28px] font-semibold leading-tight tracking-[-0.02em] md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-[15px] text-fg-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  )
}
