import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="max-w-xs text-sm text-fg-muted">{description}</p> : null}
      {action}
    </div>
  )
}
