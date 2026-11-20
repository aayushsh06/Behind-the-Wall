import { useState } from 'react'

import { Button, ErrorMessage } from '@/components/ui'
import type { InviteResult } from '@/domain/types'
import { useSendInvite } from '@/hooks/useAccess'

interface InvitePanelProps {
  email: string
  wallTitle: string
  senderName: string
}

function mailtoLink(result: InviteResult, wallTitle: string, senderName: string): string {
  const subject = `${senderName} sent you a wall record`
  const body =
    `I recorded what's inside a wall in your home (${wallTitle}) on Behind the Wall.\n\n` +
    `Create your free account with this email address to see it as a PDF:\n${result.invite_url}\n`
  return `mailto:${encodeURIComponent(result.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Shown to the tradesperson while the wall waits for an invited homeowner to sign up. */
export function InvitePanel({ email, wallTitle, senderName }: InvitePanelProps) {
  const invite = useSendInvite()
  const [copied, setCopied] = useState(false)
  const result = invite.data

  const copy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.invite_url)
      setCopied(true)
    } catch {
      window.prompt('Copy this invitation link', result.invite_url)
    }
  }

  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <h2 className="font-semibold">Waiting for {email} to sign up</h2>
      <p className="mt-1 leading-relaxed">
        This wall is saved. It moves into the homeowner’s account as soon as they create one with this email address.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!result ? (
          <Button className="sm:w-auto" fullWidth loading={invite.isPending} onClick={() => invite.mutate(email)}>
            Send invitation
          </Button>
        ) : (
          <>
            {!result.emailed ? (
              <a href={mailtoLink(result, wallTitle, senderName)} className="sm:w-auto">
                <Button fullWidth>Send from my email app</Button>
              </a>
            ) : null}
            <Button variant="secondary" className="sm:w-auto" fullWidth onClick={() => void copy()}>
              {copied ? 'Link copied' : 'Copy invitation link'}
            </Button>
          </>
        )}
      </div>
      {result ? <p className="mt-2 text-amber-900">{result.detail}</p> : null}
      {invite.isError ? (
        <div className="mt-2">
          <ErrorMessage error={invite.error} />
        </div>
      ) : null}
    </section>
  )
}
