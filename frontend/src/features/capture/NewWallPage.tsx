import { useNavigate } from 'react-router-dom'

import { routes } from '@/app/routes'
import { PageHeader } from '@/components/ui'
import { useKnownRooms } from '@/features/capture/useKnownRooms'
import { WallForm } from '@/features/capture/WallForm'
import { emptyDraft } from '@/features/capture/wallDraft'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useCreateWall } from '@/hooks/useWallMutations'

const LAST_AUTHOR_KEY = 'btw.lastAuthor'

export function NewWallPage() {
  const navigate = useNavigate()
  const createWall = useCreateWall()
  const knownRooms = useKnownRooms()
  const [lastAuthor, setLastAuthor] = useLocalStorage(LAST_AUTHOR_KEY, '')

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
