import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { homesApi } from '@/api/homes'
import { routes } from '@/app/routes'
import { Button, ErrorMessage, PageHeader, TextField } from '@/components/ui'
import { HomeAccessPanel } from '@/features/homes/HomeAccessPanel'
import { useHome } from '@/features/homes/homeContext'
import { useSignedInUser } from '@/hooks/useAuth'
import { queryKeys } from '@/hooks/queryKeys'

export function HomesPage() {
  const { home, selectHome } = useHome()
  const user = useSignedInUser()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const create = useMutation({
    mutationFn: () => homesApi.create(name.trim()),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.homes })
      selectHome(result.id)
      setName('')
    },
  })

  return (
    <>
      <PageHeader title="Homes and access" backTo={routes.home()} />
      <div className="flex flex-col gap-5">
        {home ? <p className="text-sm text-fg-muted">{home.name} · {home.permission === 'owner' ? 'You own this home' : home.permission === 'editor' ? 'You can view and edit records' : 'You can view and export records'}</p> : null}
        {home?.permission === 'owner' ? <HomeAccessPanel key={home.id} home={home} /> : null}
        {user.role === 'homeowner' ? (
          <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); create.mutate() }}>
            <TextField label="New home name" value={name} maxLength={120} required onChange={(event) => setName(event.target.value)} />
            <Button type="submit" disabled={!name.trim()} loading={create.isPending}>Create home</Button>
            {create.isError ? <ErrorMessage error={create.error} /> : null}
          </form>
        ) : (
          <p className="text-sm text-fg-muted">Ask the homeowner for an invitation link to access another home.</p>
        )}
      </div>
    </>
  )
}
