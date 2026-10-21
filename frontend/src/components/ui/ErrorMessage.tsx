interface ErrorMessageProps {
  error: unknown
  fallback?: string
}

export function ErrorMessage({ error, fallback = 'Something went wrong.' }: ErrorMessageProps) {
  const message = error instanceof Error ? error.message : fallback
  return (
    <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
      {message}
    </p>
  )
}
