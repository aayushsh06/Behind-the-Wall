export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-10 text-stone-500">
      <span className="size-5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
