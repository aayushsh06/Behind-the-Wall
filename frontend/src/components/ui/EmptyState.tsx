import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

/** A blank sheet of blueprint paper with a hatched corner: nothing recorded yet. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl bg-surface bg-blueprint px-6 py-14 text-center ring-1 ring-inset ring-line">
      <span aria-hidden="true" className="hatch absolute -right-6 -top-6 size-24 rotate-0 opacity-60" />
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      {description ? <p className="max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p> : null}
      {action}
    </div>
  )
}
