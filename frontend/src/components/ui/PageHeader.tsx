import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, backTo, action }: PageHeaderProps) {
  return (
    <header className="mb-4 flex items-start gap-3">
      {backTo ? (
        <Link
          to={backTo}
          aria-label="Back"
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-stone-200"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-stone-600">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  )
}
