interface ErrorMessageProps {
  error: unknown
  fallback?: string
}

export function ErrorMessage({ error, fallback = 'Something went wrong.' }: ErrorMessageProps) {
  const message = error instanceof Error ? error.message : fallback
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
      {message}
    </p>
  )
}
