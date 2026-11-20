import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, EmptyState, ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { ClientRow } from '@/features/find/ClientRow'
import { RoomGroup } from '@/features/find/RoomGroup'
import { WallSearch } from '@/features/find/WallSearch'
import { useWallSearch } from '@/features/find/useWallSearch'
import { useAccessRequests } from '@/hooks/useAccess'
import { useSignedInUser } from '@/hooks/useAuth'
import { useWalls } from '@/hooks/useWalls'

const COPY = {
  homeowner: {
    title: 'Walls',
    subtitle: 'Every wall recorded in your home, by room. Open one to see its PDF.',
    search: 'Search by room or wall',
    emptyTitle: 'No walls recorded yet',
    emptyBody:
      'When a tradesperson records a wall in your home, it appears here as a PDF you can open any time. Give them the email address you signed up with.',
  },
  tradesperson: {
    title: 'Clients',
    subtitle: 'Homeowners you’ve recorded walls for. Open one to see their walls.',
    search: 'Search by client, room, or wall',
    emptyTitle: 'No walls recorded yet',
    emptyBody: 'Record a wall while it’s open and add it to the homeowner’s account using their email address.',
  },
} as const

export function WallListPage() {
  const user = useSignedInUser()
  const wallsQuery = useWalls()
  const { query, setQuery, groups, clients } = useWallSearch(wallsQuery.data)
  const isTrade = user.role === 'tradesperson'
  const copy = COPY[user.role]
  const hasResults = isTrade ? clients.length > 0 : groups.length > 0

  return (
    <>
      <PageHeader eyebrow={isTrade ? 'Your work' : 'Your home'} title={copy.title} subtitle={copy.subtitle} />
      {isTrade ? null : <PendingAccessNotice />}
      <div className="mb-10 max-w-md">
        <WallSearch value={query} onChange={setQuery} placeholder={copy.search} />
      </div>

      {wallsQuery.isPending ? <Spinner label="Loading walls" /> : null}
      {wallsQuery.isError ? <ErrorMessage error={wallsQuery.error} /> : null}

      {wallsQuery.isSuccess && wallsQuery.data.length === 0 ? (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyBody}
          action={
            isTrade ? (
              <Link to={routes.newWall()} className="w-full max-w-xs">
                <Button fullWidth arrow>
                  Record a wall
                </Button>
              </Link>
            ) : (
              <p className="text-sm font-medium text-fg">{user.email}</p>
            )
          }
        />
      ) : null}

      {wallsQuery.isSuccess && wallsQuery.data.length > 0 && !hasResults ? (
        <EmptyState title="No matches" description={`Nothing matches “${query}”.`} />
      ) : null}

      {isTrade ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {clients.map((group) => (
            <ClientRow key={group.client.id} {...group} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-12">
          {groups.map((group) => (
            <RoomGroup key={group.room} {...group} />
          ))}
        </div>
      )}
    </>
  )
}

/** Tells a homeowner that a tradesperson is waiting for edit access. */
function PendingAccessNotice() {
  const requests = useAccessRequests()
  const pending = requests.data?.filter((g) => g.status === 'pending') ?? []
  if (pending.length === 0) return null
  const names = pending.map((g) => g.tradesperson.name).join(', ')
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-brand-soft px-5 py-4 ring-1 ring-inset ring-amber-200 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <p>
        <span className="font-semibold">{names}</span> {pending.length === 1 ? 'is' : 'are'} asking for access to
        correct walls in your home.
      </p>
      <Link to={`${routes.settings()}#access`} className="shrink-0">
        <Button variant="secondary">Review</Button>
      </Link>
    </div>
  )
}
