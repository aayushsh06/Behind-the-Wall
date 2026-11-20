import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { invitesApi } from '@/api/access'
import { EMAIL_PATTERN } from '@/features/capture/validation'

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/** Whether an email can receive walls, checked shortly after the tradesperson stops typing. */
export function useHomeownerStatus(rawEmail: string, enabled: boolean) {
  const email = useDebounced(rawEmail.trim().toLowerCase(), 400)
  const current = rawEmail.trim().toLowerCase()
  const valid = EMAIL_PATTERN.test(email)
  const query = useQuery({
    queryKey: ['homeowner-status', email],
    queryFn: () => invitesApi.lookup(email),
    enabled: enabled && valid,
    staleTime: 30_000,
    retry: 0,
  })
  // Only trust a result for exactly what is in the field now.
  const status = query.data && email === current ? query.data.status : undefined
  return { status, checking: enabled && EMAIL_PATTERN.test(current) && status === undefined }
}
