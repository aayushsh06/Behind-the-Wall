export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-12 text-fg-muted">
      <span className="size-5 animate-spin rounded-full border-2 border-fg-faint border-t-accent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
