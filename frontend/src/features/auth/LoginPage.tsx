import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, ErrorMessage, PageHeader, SectionHeading, TextField } from '@/components/ui'
import { useLogin } from '@/hooks/useAuth'

/** Matches the accounts created by the backend's demo seed (app/services/demo_accounts.py). */
const DEMO_ACCOUNTS = [
  { label: 'Homeowner', email: 'homeowner@example.com' },
  { label: 'Tradesperson', email: 'tradesperson@example.com' },
] as const
const DEMO_PASSWORD = 'demo1234'

export function LoginPage() {
  const { state } = useLocation()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    login.mutate({ email, password })
  }

  return (
    <>
      <PageHeader title="Sign in" subtitle="Welcome back" backTo={routes.welcome()} />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {login.isError ? <ErrorMessage error={login.error} /> : null}
        <Button type="submit" size="lg" fullWidth loading={login.isPending} disabled={!email || !password}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-fg-muted">
        New here?{' '}
        <Link to={routes.register()} state={state} className="font-semibold text-accent">
          Create an account
        </Link>
      </p>

      <section className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface/50 p-4">
        <SectionHeading>Demo accounts</SectionHeading>
        <p className="mb-3 text-sm text-fg-muted">Both share the sample home. Tap one to fill in its details.</p>
        <div className="flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              variant="secondary"
              fullWidth
              onClick={() => {
                setEmail(account.email)
                setPassword(DEMO_PASSWORD)
                login.reset()
              }}
            >
              <span>{account.label}</span>
              <span className="text-xs font-medium text-fg-faint">{account.email}</span>
            </Button>
          ))}
        </div>
      </section>
    </>
  )
}
