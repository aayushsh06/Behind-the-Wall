import type { ReactNode } from 'react'

/** Quiet explanatory panel for instructions and empty sections. */
export function InfoBox({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-fg-muted">{children}</p>
}
