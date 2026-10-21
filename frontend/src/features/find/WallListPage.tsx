import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, EmptyState, ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { RoomGroup } from '@/features/find/RoomGroup'
import { WallSearch } from '@/features/find/WallSearch'
import { useWallSearch } from '@/features/find/useWallSearch'
import { useSeedSampleHome } from '@/hooks/useSeedSampleHome'
import { useWalls } from '@/hooks/useWalls'

export function WallListPage() {
  const wallsQuery = useWalls()
  const seed = useSeedSampleHome()
  const { query, setQuery, groups } = useWallSearch(wallsQuery.data)

  return (
    <>
      <PageHeader title="Walls" subtitle="Find a wall to see what is behind it" />
      <div className="mb-4">
        <WallSearch value={query} onChange={setQuery} />
      </div>

      {wallsQuery.isPending ? <Spinner label="Loading walls" /> : null}
      {wallsQuery.isError ? <ErrorMessage error={wallsQuery.error} /> : null}

      {wallsQuery.isSuccess && wallsQuery.data.length === 0 ? (
        <EmptyState
          title="No walls recorded yet"
          description="Record a wall when it is open, or load the sample home to explore."
          action={
            <div className="flex flex-col gap-2">
              <Link to={routes.newWall()}>
                <Button fullWidth>Record a wall</Button>
              </Link>
              <Button variant="secondary" loading={seed.isPending} onClick={() => seed.mutate()}>
                Load sample home
              </Button>
              {seed.isError ? <ErrorMessage error={seed.error} /> : null}
            </div>
          }
        />
      ) : null}

      {wallsQuery.isSuccess && wallsQuery.data.length > 0 && groups.length === 0 ? (
        <EmptyState title="No walls match" description={`Nothing matches “${query}”.`} />
      ) : null}

      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <RoomGroup key={group.room} {...group} />
        ))}
      </div>
    </>
  )
}
