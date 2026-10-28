import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, ErrorMessage, PageHeader, SegmentedControl, TextField } from '@/components/ui'
import type { SegmentOption } from '@/components/ui'
import type { Role } from '@/domain/types'
import { useRegister } from '@/hooks/useAuth'

const ROLE_OPTIONS: readonly SegmentOption<Role>[] = [
  { value: 'homeowner', label: 'Homeowner' },
  { value: 'tradesperson', label: 'Tradesperson' },
]

const ROLE_HINT: Record<Role, string> = {
  homeowner: 'You keep the records for your home and share them when work is needed.',
  tradesperson: 'You record walls while they are open and leave the record with the homeowner.',
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('homeowner')
  const [errors, setErrors] = useState<Errors>({})

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = validate(name, email, password)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    register.mutate({ name: name.trim(), email: email.trim(), password, role })
  }

  return (
    <>
      <PageHeader title="Create account" subtitle="Keep your home's wall records in one place" backTo={routes.welcome()} />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div>
          <SegmentedControl label="I am a" options={ROLE_OPTIONS} value={role} onChange={setRole} />
          <p className="mt-1.5 text-xs text-fg-faint">{ROLE_HINT[role]}</p>
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
        <Link to={routes.login()} state={state} className="font-semibold text-accent">
          Sign in
        </Link>
      </p>
    </>
  )
}
