import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, ErrorMessage, InfoBox, PageHeader, SegmentedControl, TextField } from '@/components/ui'
import type { SegmentOption } from '@/components/ui'
import type { Role } from '@/domain/types'
import { AuthCard } from '@/features/auth/AuthLayout'
import { useRegister } from '@/hooks/useAuth'

const ROLE_OPTIONS: readonly SegmentOption<Role>[] = [
  { value: 'homeowner', label: 'Homeowner' },
  { value: 'tradesperson', label: 'Tradesperson' },
]

const ROLE_HINT: Record<Role, string> = {
  homeowner: 'Tradespeople send the walls they record in your home to your account. You can open each one as a PDF.',
  tradesperson: 'You record walls while they’re open and send them to each homeowner’s account using their email address.',
}

const MIN_PASSWORD = 8
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

interface Errors {
  name?: string
  email?: string
  password?: string
}

function validate(name: string, email: string, password: string): Errors {
  const errors: Errors = {}
  if (!name.trim()) errors.name = 'Enter your name'
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address'
  if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters`
  return errors
}

export function RegisterPage() {
  const { state } = useLocation()
  const register = useRegister()
  const [name, setName] = useState('')
  // Invitation links carry the invited email and role.
  const [params] = useSearchParams()
  const invitedEmail = params.get('email') ?? ''
  const [email, setEmail] = useState(invitedEmail)
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(params.get('role') === 'tradesperson' ? 'tradesperson' : 'homeowner')
  const [errors, setErrors] = useState<Errors>({})

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = validate(name, email, password)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    register.mutate({ name: name.trim(), email: email.trim(), password, role })
  }

  return (
    <AuthCard>
      <PageHeader title="Create an account" backTo={routes.welcome()} />

      {invitedEmail ? (
        <div className="mb-5">
          <InfoBox>
            A tradesperson sent you a wall record. Create your account with this email address and it will be waiting
            for you.
          </InfoBox>
        </div>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div>
          <SegmentedControl label="I am a" options={ROLE_OPTIONS} value={role} onChange={setRole} />
          <p className="mt-1.5 text-sm text-fg-muted">{ROLE_HINT[role]}</p>
        </div>
        <TextField
          label="Name"
          autoComplete="name"
          placeholder={role === 'homeowner' ? 'Your name' : 'Your name or company'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {register.isError ? <ErrorMessage error={register.error} /> : null}
        <Button type="submit" size="lg" fullWidth loading={register.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link to={routes.login()} state={state} className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
