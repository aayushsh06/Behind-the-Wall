import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { homesApi } from '@/api/homes'
import type { Home, Invitation } from '@/api/homes'
import { Button, ErrorMessage, SectionHeading, TextField } from '@/components/ui'

export function HomeAccessPanel({ home }: { home: Home }) {
  const queryClient = useQueryClient()
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer')
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const membersKey = ['home-members', home.id]
  const invitationsKey = ['home-invitations', home.id]
  const members = useQuery({ queryKey: membersKey, queryFn: () => homesApi.members(home.id) })
  const invitations = useQuery({ queryKey: invitationsKey, queryFn: () => homesApi.invitations(home.id) })
  const invite = useMutation({
    mutationFn: () => homesApi.invite(home.id, permission),
    onSuccess: (result) => {
      setInvitation(result)
      void queryClient.invalidateQueries({ queryKey: invitationsKey })
    },
  })
  const remove = useMutation({
    mutationFn: (userId: string) => homesApi.removeMember(home.id, userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: membersKey }),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => homesApi.revoke(home.id, id),
    onSuccess: (_, id) => {
      if (invitation?.id === id) setInvitation(null)
      void queryClient.invalidateQueries({ queryKey: invitationsKey })
    },
  })

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <SectionHeading>Contractor access</SectionHeading>
      <p className="text-sm text-fg-muted">Choose what someone can do, then send them an invitation link.</p>
      <label className="text-sm text-fg-muted">
        Permission
        <select
          className="mt-1 block w-full rounded-xl border border-line bg-surface-2 p-2.5 text-fg"
          value={permission}
          onChange={(event) => setPermission(event.target.value as 'viewer' | 'editor')}
        >
          <option value="viewer">View and export records</option>
          <option value="editor">View, add, edit, and delete records</option>
        </select>
      </label>
      <Button loading={invite.isPending} onClick={() => invite.mutate()}>Create invitation link</Button>
      {invite.isError ? <ErrorMessage error={invite.error} /> : null}
      {invitation ? (
        <>
          <TextField
            label="Invitation link"
            readOnly
            value={`${window.location.origin}${import.meta.env.BASE_URL}join/${invitation.token}`}
            onFocus={(event) => event.target.select()}
          />
          <p className="text-xs text-fg-muted">Copy and send this link. Anyone with it can accept once after signing in. It expires in seven days.</p>
        </>
      ) : null}
      <SectionHeading>People with access</SectionHeading>
      {members.isPending ? <p className="text-sm text-fg-muted">Loading people…</p> : null}
      {members.isError ? <ErrorMessage error={members.error} /> : null}
      {members.data?.length === 0 ? <p className="text-sm text-fg-muted">Only you have access.</p> : null}
      {members.data?.map((member) => (
        <div key={member.user_id} className="flex items-center justify-between gap-2">
          <p className="min-w-0 break-words text-sm">{member.name} · {member.email}<br />{member.permission === 'editor' ? 'Can edit' : 'Can view'}</p>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(member.user_id)}>Remove</Button>
        </div>
      ))}
      {remove.isError ? <ErrorMessage error={remove.error} /> : null}
      <SectionHeading>Pending invitations</SectionHeading>
      {invitations.isError ? <ErrorMessage error={invitations.error} /> : null}
      {invitations.data?.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
          <p>{item.permission === 'editor' ? 'Can edit' : 'Can view'} · expires {new Date(item.expires_at).toLocaleDateString()}</p>
          <Button variant="secondary" loading={revoke.isPending} onClick={() => revoke.mutate(item.id)}>Revoke</Button>
        </div>
      ))}
      {revoke.isError ? <ErrorMessage error={revoke.error} /> : null}
    </section>
  )
}
