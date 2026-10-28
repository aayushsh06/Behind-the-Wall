import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { routes } from '@/app/routes'
import { ErrorMessage, Spinner } from '@/components/ui'
import { useCurrentUser } from '@/hooks/useAuth'

/** Where to return after signing in. Passed along as router state. */
export interface ReturnState {
  from?: string
}

/** Signed-in screens only. Anyone else goes to the welcome page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const user = useCurrentUser()

  if (user.isPending) return <Spinner label="Checking sign-in" />
  if (user.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-10">
        <ErrorMessage error={user.error} />
      </div>
    )
  }
  if (!user.data) {
    const state: ReturnState = { from: location.pathname + location.search }
    return <Navigate to={routes.welcome()} replace state={state} />
  }
  return children
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
