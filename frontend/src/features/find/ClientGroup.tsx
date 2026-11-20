import { RoomGroup } from '@/features/find/RoomGroup'
import type { ClientGroupData } from '@/features/find/useWallSearch'

/** One homeowner in a tradesperson's list, with the walls recorded for them by room. */
export function ClientGroup({ client, rooms, wallCount }: ClientGroupData) {
  return (
    <section aria-label={`${client.name}, ${client.email}`} className="rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{client.name}</h2>
          {client.pending ? (
            <p className="text-sm text-amber-800">Invited · hasn’t signed up yet</p>
          ) : (
            <p className="truncate text-sm text-fg-muted">{client.email}</p>
          )}
        </div>
        <span className="text-sm text-fg-faint">
          {wallCount} {wallCount === 1 ? 'wall' : 'walls'}
        </span>
      </header>
      <div className="flex flex-col gap-6 p-4 sm:p-5">
        {rooms.map((group) => (
          <RoomGroup key={group.room} {...group} idPrefix={client.id} />
        ))}
      </div>
    </section>
  )
}
