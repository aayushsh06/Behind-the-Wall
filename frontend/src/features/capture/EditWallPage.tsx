import { useNavigate, useParams } from 'react-router-dom'

import { photosApi } from '@/api/photos'
import { routes } from '@/app/routes'
import { ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { useKnownRooms } from '@/features/capture/useKnownRooms'
import { WallForm } from '@/features/capture/WallForm'
import { draftFromWall } from '@/features/capture/wallDraft'
import { usePhoto } from '@/hooks/usePhoto'
import { useWall } from '@/hooks/useWall'
import { useUpdateWall } from '@/hooks/useWallMutations'

export function EditWallPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const wallQuery = useWall(id)
  const photoQuery = usePhoto(wallQuery.data?.photo_id)
  const updateWall = useUpdateWall(id)
  const knownRooms = useKnownRooms()

  if (wallQuery.isPending) return <Spinner label="Loading wall" />
  if (wallQuery.isError) return <ErrorMessage error={wallQuery.error} />
  if (wallQuery.data.photo_id && photoQuery.isPending) return <Spinner label="Loading photo" />

  const wall = wallQuery.data
  const size = photoQuery.data ? { width: photoQuery.data.width, height: photoQuery.data.height } : null

  return (
    <>
      <PageHeader title="Edit wall" subtitle={`${wall.room} · ${wall.label}`} backTo={routes.wall(wall.id)} />
      <WallForm
        initialDraft={draftFromWall(wall, (id) => photosApi.url(id, wall.updated_at), size)}
        knownRooms={knownRooms}
        submitLabel="Save changes"
        submitting={updateWall.isPending}
        submitError={updateWall.error}
        onSubmit={(input) =>
          updateWall.mutate(input, { onSuccess: () => navigate(routes.wall(wall.id), { replace: true }) })
        }
      />
    </>
  )
}
