import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { homesApi } from '@/api/homes'
import { routes } from '@/app/routes'
import { Button, ErrorMessage, PageHeader } from '@/components/ui'
import { useHome } from '@/features/homes/homeContext'
import { useSignedInUser } from '@/hooks/useAuth'
import { queryKeys } from '@/hooks/queryKeys'

export function JoinHomePage() {
  const { token = '' } = useParams<{ token: string }>()
  const { selectHome } = useHome()
  const user = useSignedInUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accept = useMutation({
    mutationFn: () => homesApi.accept(token),
    onSuccess: async (home) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.homes })
      selectHome(home.id)
      void navigate(routes.home(), { replace: true })
    },
  })

  return (
    <>
      <PageHeader title="Home invitation" />
      <p className="mb-4 text-sm text-fg-muted">Accept as {user.email} to access the home's wall records with the permission chosen by the homeowner.</p>
      <Button fullWidth loading={accept.isPending} onClick={() => accept.mutate()}>Accept invitation</Button>
      {accept.isError ? <div className="mt-3"><ErrorMessage error={accept.error} /></div> : null}
      <Link className="mt-4 block text-center text-sm text-accent" to={routes.home()}>Back to walls</Link>
    </>
  )
}
