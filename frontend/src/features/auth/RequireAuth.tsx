import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { routes } from '@/app/routes'
import { ErrorMessage, Spinner } from '@/components/ui'
import { useCurrentUser } from '@/hooks/useAuth'

import type { ReturnState } from '@/features/auth/PublicOnly'
import { Landing } from '@/features/marketing/Landing'

/**
 * Signed-in screens only. A signed-out visitor sees the landing page at "/", and is sent
 * there from any other signed-in address (remembering it, to return after signing in).
 */
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
    if (location.pathname === routes.home()) return <Landing />
    const state: ReturnState = { from: location.pathname + location.search }
    return <Navigate to={routes.home()} replace state={state} />
  }
  return children
}

/** Recording and editing screens. Homeowner accounts are read-only and go back to their walls. */
export function TradespersonOnly({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  if (user.data?.role !== 'tradesperson') return <Navigate to={routes.home()} replace />
  return children
}
