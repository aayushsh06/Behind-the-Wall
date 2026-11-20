import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { authApi } from '@/api/auth'
import { routes } from '@/app/routes'
import { Button, ErrorMessage, Spinner } from '@/components/ui'
import { AuthCard, AuthChrome } from '@/features/auth/AuthLayout'
import { useCurrentUser, useLogout } from '@/hooks/useAuth'
import { queryKeys } from '@/hooks/queryKeys'

/** Shown instead of the app to a signed-in account that hasn't confirmed its email. */
export function CheckEmailPage({ email }: { email: string }) {
  const resend = useMutation({ mutationFn: authApi.resendVerification })
  const logout = useLogout()

  return (
    <AuthChrome>
      <AuthCard>
        <h1 className="text-2xl font-semibold">Confirm your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          We sent a confirmation link to <strong className="font-semibold text-fg">{email}</strong>. Open it to finish
          setting up your account. Walls sent to this address are held until you confirm it.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Can’t find it? Check your spam folder, or send a new link. The link expires after 48 hours.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button loading={resend.isPending} onClick={() => resend.mutate()}>
            Send a new link
          </Button>
          <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate()}>
            Use a different account
          </Button>
        </div>
        {resend.isSuccess ? <p className="mt-3 text-sm text-green-700">A new link is on its way.</p> : null}
        {resend.isError ? (
          <div className="mt-3">
            <ErrorMessage error={resend.error} />
          </div>
        ) : null}
      </AuthCard>
    </AuthChrome>
  )
}

/** Opened from the confirmation email: /verify-email?token=… */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const queryClient = useQueryClient()
  const user = useCurrentUser()
  const verify = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  })
  const started = useRef(false)

  useEffect(() => {
    // Tokens are single-use, so make sure the request is sent only once.
    if (started.current || !token) return
    started.current = true
    verify.mutate(token)
  }, [token, verify])

  const signedIn = Boolean(user.data)
  return (
    <AuthChrome>
      <AuthCard>
        {!token ? <ErrorMessage error={new Error('This link is missing its confirmation code.')} /> : null}
        {verify.isPending ? <Spinner label="Confirming your email" /> : null}
        {verify.isError ? (
          <>
            <h1 className="mb-3 text-2xl font-semibold">Link didn’t work</h1>
            <ErrorMessage error={verify.error} />
            <Link to={signedIn ? routes.home() : routes.login()} className="mt-5 block">
              <Button fullWidth>{signedIn ? 'Get a new link' : 'Sign in'}</Button>
            </Link>
          </>
        ) : null}
        {verify.isSuccess ? (
          <>
            <h1 className="text-2xl font-semibold">Email confirmed</h1>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">
              {verify.data.email} is confirmed.
              {verify.data.walls_received > 0
                ? ` ${verify.data.walls_received} ${verify.data.walls_received === 1 ? 'wall was' : 'walls were'} waiting for you and ${verify.data.walls_received === 1 ? 'is' : 'are'} now in your account.`
                : ''}
            </p>
            <Link to={signedIn ? routes.home() : routes.login()} className="mt-6 block">
              <Button fullWidth>{signedIn ? 'Continue' : 'Sign in'}</Button>
            </Link>
          </>
        ) : null}
      </AuthCard>
    </AuthChrome>
  )
}
