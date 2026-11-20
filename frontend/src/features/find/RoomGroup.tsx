import { WallListItem } from '@/features/find/WallListItem'
import type { RoomGroupData } from '@/features/find/useWallSearch'

interface RoomGroupProps extends RoomGroupData {
  /** Keeps heading ids unique when the same room name appears under several clients. */
  idPrefix?: string
}

/**
 * One room's walls. The heading is a full section title that sticks below the top bar
 * while its walls scroll past, so it's always clear which room you're looking at; the
 * next room's heading takes over when it arrives. Drawn like a dimension line: an end
 * mark, the room, its count, and a line running to the edge.
 */
export function RoomGroup({ room, walls, idPrefix = '' }: RoomGroupProps) {
  const id = `room-${idPrefix}-${room.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <section aria-labelledby={id}>
      <div className="sticky top-[65px] z-20 -mx-4 mb-4 flex items-center gap-3 bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <span aria-hidden="true" className="h-7 w-1 shrink-0 rounded-full bg-brand" />
        <h2 id={id} className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
          {room}
        </h2>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-fg-muted">
          {walls.length} {walls.length === 1 ? 'wall' : 'walls'}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
        <span aria-hidden="true" className="h-3 w-px shrink-0 bg-line-strong" />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {walls.map((wall) => (
          <WallListItem key={wall.id} wall={wall} />
        ))}
      </ul>
    </section>
  )
}
