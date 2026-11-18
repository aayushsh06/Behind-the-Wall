import { useNavigate } from 'react-router-dom'

import { routes } from '@/app/routes'
import { EmptyState, PageHeader } from '@/components/ui'
import { useHome } from '@/features/homes/homeContext'
import { useKnownRooms } from '@/features/capture/useKnownRooms'
import { WallForm } from '@/features/capture/WallForm'
import { emptyDraft } from '@/features/capture/wallDraft'
import { useSignedInUser } from '@/hooks/useAuth'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useCreateWall } from '@/hooks/useWallMutations'

export function NewWallPage() {
  const navigate = useNavigate()
  const createWall = useCreateWall()
  const knownRooms = useKnownRooms()
  const user = useSignedInUser()
  // Starts as the account name; remembers an edit such as a company name, per account.
  const [lastAuthor, setLastAuthor] = useLocalStorage(`btw.lastAuthor.${user.id}`, user.name)
  const { home } = useHome()

  if (!home || home.permission === 'viewer') {
    return <EmptyState title="Recording requires edit access" description="Ask the homeowner for permission to add or edit wall records." />
  }

  return (
    <>
      <PageHeader title="Record a wall" backTo={routes.home()} />
      <WallForm
        initialDraft={emptyDraft(lastAuthor)}
        knownRooms={knownRooms}
        submitLabel="Save wall"
        submitting={createWall.isPending}
        submitError={createWall.error}
        onSubmit={(input) => {
          setLastAuthor(input.author)
          createWall.mutate(input, { onSuccess: (wall) => navigate(routes.wall(wall.id), { replace: true }) })
        }}
      />
    </>
  )
}
