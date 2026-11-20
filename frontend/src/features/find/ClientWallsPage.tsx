import { Link, useParams } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, EmptyState, ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { clientOf } from '@/features/capture/useKnownRooms'
import { RoomGroup } from '@/features/find/RoomGroup'
import { WallSearch } from '@/features/find/WallSearch'
import { useWallSearch } from '@/features/find/useWallSearch'
import { useWalls } from '@/hooks/useWalls'

/** A tradesperson's view of one client: just that home's walls, by room. */
export function ClientWallsPage() {
  const { key = '' } = useParams<{ key: string }>()
  const wallsQuery = useWalls()
  const mine = wallsQuery.data?.filter((wall) => clientOf(wall)?.id === key)
  const { query, setQuery, groups } = useWallSearch(mine)
  const client = mine?.[0] ? clientOf(mine[0]) : null

  if (wallsQuery.isPending) return <Spinner label="Loading walls" />
  if (wallsQuery.isError) return <ErrorMessage error={wallsQuery.error} />
  if (!client) {
    return (
      <>
        <PageHeader title="Client not found" backTo={routes.home()} />
        <EmptyState title="No walls for this client" description="They may have been removed, or the link is out of date." />
      </>
    )
  }

  const roomCount = new Set(mine!.map((w) => w.room)).size
  return (
    <>
      <PageHeader
        eyebrow="Client"
        title={client.name}
        subtitle={`${client.pending ? 'Invited, hasn’t signed up yet' : client.email} · ${mine!.length} ${mine!.length === 1 ? 'wall' : 'walls'} in ${roomCount} ${roomCount === 1 ? 'room' : 'rooms'}`}
        backTo={routes.home()}
        backLabel="Clients"
        action={
          <Link to={routes.newWall(client.email)} className="hidden md:block">
            <Button variant="secondary" arrow>
              Record a wall here
            </Button>
          </Link>
        }
      />
      <Link to={routes.newWall(client.email)} className="-mt-3 mb-6 block md:hidden">
        <Button variant="secondary" arrow fullWidth>
          Record a wall here
        </Button>
      </Link>
      <div className="mb-10 max-w-md">
        <WallSearch value={query} onChange={setQuery} placeholder="Search by room or wall" />
      </div>
      {groups.length === 0 ? <EmptyState title="No matches" description={`Nothing matches “${query}”.`} /> : null}
      <div className="flex flex-col gap-12">
        {groups.map((group) => (
          <RoomGroup key={group.room} {...group} idPrefix={client.id} />
        ))}
      </div>
    </>
  )
}
