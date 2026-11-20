import { useState } from 'react'

import { Button, Chip, ErrorMessage, SectionHeading, TextField } from '@/components/ui'
import type { AccessGrant, AccessStatus } from '@/domain/types'
import { EMAIL_PATTERN } from '@/features/capture/validation'
import { useAccessRequests, useDecideAccess, useRequestAccess } from '@/hooks/useAccess'
import { formatTimestamp } from '@/lib/format'

const CARD = 'rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5'
const STATUS: Record<AccessStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  pending: { label: 'Waiting for approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
  revoked: { label: 'Access removed', tone: 'danger' },
}

/** Homeowner: approve or decline tradespeople who want to correct walls, and remove access. */
export function HomeownerAccessSection() {
  const requests = useAccessRequests()
  const decide = useDecideAccess()
  const pending = requests.data?.filter((g) => g.status === 'pending') ?? []
  const approved = requests.data?.filter((g) => g.status === 'approved') ?? []

  return (
    <section className={CARD} id="access">
      <SectionHeading>Edit access</SectionHeading>
      <p className="mb-4 text-sm leading-relaxed text-fg-muted">
        Your account is read-only: tradespeople record and update the walls in your home. A tradesperson who didn’t
        record a wall can ask to view and correct the walls in your home. Approve only people working on your home.
      </p>

      {requests.isError ? <ErrorMessage error={requests.error} /> : null}

      <h3 className="mb-2 text-sm font-semibold">Requests</h3>
      {pending.length === 0 ? (
        <p className="mb-4 text-sm text-fg-faint">No requests waiting.</p>
      ) : (
        <ul className="mb-4 divide-y divide-line rounded-md border border-line">
          {pending.map((grant) => (
            <li key={grant.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <Person grant={grant} />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: grant.id, decision: 'decline' })}
                >
                  Decline
                </Button>
                <Button
                  loading={decide.isPending && decide.variables?.id === grant.id}
                  onClick={() => decide.mutate({ id: grant.id, decision: 'approve' })}
                >
                  Approve
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-2 text-sm font-semibold">Tradespeople with edit access</h3>
      {approved.length === 0 ? (
        <p className="text-sm text-fg-faint">Only the tradespeople who recorded a wall can edit it.</p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {approved.map((grant) => (
            <li key={grant.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <Person grant={grant} />
              <Button
                variant="danger"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ id: grant.id, decision: 'revoke' })}
              >
                Remove access
              </Button>
            </li>
          ))}
        </ul>
      )}
      {decide.isError ? (
        <div className="mt-3">
          <ErrorMessage error={decide.error} />
        </div>
      ) : null}
    </section>
  )
}

function Person({ grant }: { grant: AccessGrant }) {
  return (
    <div className="min-w-0 text-sm">
      <p className="font-semibold">{grant.tradesperson.name}</p>
      <p className="truncate text-fg-muted">{grant.tradesperson.email}</p>
      {grant.message ? <p className="mt-1 text-fg-muted">“{grant.message}”</p> : null}
      <p className="mt-0.5 text-xs text-fg-faint">Requested {formatTimestamp(grant.created_at)}</p>
    </div>
  )
}

/** Tradesperson: ask a homeowner for access to correct walls in their home. */
export function TradespersonAccessSection() {
  const requests = useAccessRequests()
  const request = useRequestAccess()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string>()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter the homeowner's email address")
      return
    }
    request.mutate(
      { email: email.trim(), message: message.trim() },
      {
        onSuccess: () => {
          setEmail('')
          setMessage('')
        },
      },
    )
  }

  return (
    <section className={CARD} id="access">
      <SectionHeading>Request edit access</SectionHeading>
      <p className="mb-4 text-sm leading-relaxed text-fg-muted">
        Working on a home where someone else recorded the walls? Ask the homeowner for access. Once they approve, you
        can view and correct every wall in their home. Each save updates the PDF they see.
      </p>
      <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
        <TextField
          label="Homeowner's email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(undefined)
            request.reset()
          }}
          error={error}
        />
        <TextField
          label="Message (optional)"
          placeholder="Replacing the kitchen sink drain next week"
          value={message}
          maxLength={500}
          onChange={(event) => setMessage(event.target.value)}
        />
        {request.isError ? <ErrorMessage error={request.error} /> : null}
        {request.isSuccess ? (
          <p className="text-sm text-green-700">
            Request sent to {request.data.homeowner.name}. They’ll see it in their account.
          </p>
        ) : null}
        <Button type="submit" className="w-full sm:w-auto sm:self-start" loading={request.isPending}>
          Send request
        </Button>
      </form>

      {requests.data && requests.data.length > 0 ? (
        <>
          <h3 className="mb-2 mt-6 text-sm font-semibold">Your requests</h3>
          <ul className="divide-y divide-line rounded-md border border-line">
            {requests.data.map((grant) => (
              <li key={grant.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{grant.homeowner.name}</p>
                  <p className="truncate text-fg-muted">{grant.homeowner.email}</p>
                </div>
                <Chip tone={STATUS[grant.status].tone}>{STATUS[grant.status].label}</Chip>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
