import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center">
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="text-sm text-stone-600">{description}</p> : null}
      {action}
    </div>
  )
}
