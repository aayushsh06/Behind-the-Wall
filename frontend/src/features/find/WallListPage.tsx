import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, EmptyState, ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { RoomGroup } from '@/features/find/RoomGroup'
import { WallSearch } from '@/features/find/WallSearch'
import { useWallSearch } from '@/features/find/useWallSearch'
import { useSignedInUser } from '@/hooks/useAuth'
import { useSeedSampleHome } from '@/hooks/useSeedSampleHome'
import { useWalls } from '@/hooks/useWalls'
import { useHome } from '@/features/homes/homeContext'

const SUBTITLE = {
  homeowner: 'Find a wall in your home to see what is behind it',
  tradesperson: 'Find a wall you recorded, or record a new one',
} as const

export function WallListPage() {
  const { home } = useHome()
  const user = useSignedInUser()
  const wallsQuery = useWalls()
  const seed = useSeedSampleHome()
  const { query, setQuery, groups } = useWallSearch(wallsQuery.data)

  if (!home) return <EmptyState title="No home access yet" description="Ask a homeowner for an invitation link to view or record their walls." />
  const canEdit = home.permission !== 'viewer'

  return (
    <>
      <PageHeader title="Walls" subtitle={canEdit ? SUBTITLE[user.role] : 'View the wall records shared with you'} />
      <div className="mb-5">
        <WallSearch value={query} onChange={setQuery} />
      </div>

      {wallsQuery.isPending ? <Spinner label="Loading walls" /> : null}
      {wallsQuery.isError ? <ErrorMessage error={wallsQuery.error} /> : null}

      {wallsQuery.isSuccess && wallsQuery.data.length === 0 ? (
        <EmptyState
          title="No walls recorded yet"
          description={canEdit ? 'Record a wall when it is open, or load sample records to explore.' : 'The homeowner has not added any wall records yet.'}
          action={
            canEdit ? <div className="flex flex-col gap-2">
              <Link to={routes.newWall()}>
                <Button fullWidth>Record a wall</Button>
              </Link>
              <Button variant="secondary" loading={seed.isPending} onClick={() => seed.mutate()}>
                Load sample home
              </Button>
              {seed.isError ? <ErrorMessage error={seed.error} /> : null}
            </div> : undefined
          }
        />
      ) : null}

      {wallsQuery.isSuccess && wallsQuery.data.length > 0 && groups.length === 0 ? (
        <EmptyState title="No walls match" description={`Nothing matches “${query}”.`} />
      ) : null}

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <RoomGroup key={group.room} {...group} />
        ))}
      </div>
    </>
  )
}
