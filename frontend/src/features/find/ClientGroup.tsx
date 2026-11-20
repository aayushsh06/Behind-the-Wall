import { RoomGroup } from '@/features/find/RoomGroup'
import type { ClientGroupData } from '@/features/find/useWallSearch'

/** One homeowner in a tradesperson's list, with the walls recorded for them by room. */
export function ClientGroup({ client, rooms, wallCount }: ClientGroupData) {
  return (
    <section aria-label={`${client.name}, ${client.email}`} className="rounded-3xl bg-surface ring-1 ring-inset ring-line">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight">{client.name}</h2>
          {client.pending ? (
            <p className="text-sm text-amber-800">Invited · hasn’t signed up yet</p>
          ) : (
            <p className="truncate text-sm text-fg-muted">{client.email}</p>
          )}
        </div>
        <span className="eyebrow text-fg-faint">
          {wallCount} {wallCount === 1 ? 'wall' : 'walls'}
        </span>
      </header>
      <div className="flex flex-col gap-8 p-5 sm:p-6">
        {rooms.map((group) => (
          <RoomGroup key={group.room} {...group} idPrefix={client.id} />
        ))}
      </div>
    </section>
  )
}
