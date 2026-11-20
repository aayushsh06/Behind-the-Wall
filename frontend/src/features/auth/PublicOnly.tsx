import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Spinner } from '@/components/ui'
import { useCurrentUser } from '@/hooks/useAuth'

/** Where to return after signing in. Passed along as router state. */
export interface ReturnState {
  from?: string
}

/**
 * Welcome, sign-in and create-account screens. Once signed in (including right after
 * signing in here) the user goes back to the page that sent them, or to their walls.
 */
export function PublicOnly({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  const state = useLocation().state as ReturnState | null

  if (user.isPending) return <Spinner label="Checking sign-in" />
  if (user.data) {
    const target = state?.from?.startsWith('/') ? state.from : routes.home()
    return <Navigate to={target} replace />
  }
  return children
}
