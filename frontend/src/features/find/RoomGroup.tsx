import { WallListItem } from '@/features/find/WallListItem'
import type { RoomGroupData } from '@/features/find/useWallSearch'

export function RoomGroup({ room, walls }: RoomGroupData) {
  return (
    <section aria-labelledby={`room-${room}`}>
      <h2 id={`room-${room}`} className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
        {room}
      </h2>
      <ul className="flex flex-col gap-2">
        {walls.map((wall) => (
          <WallListItem key={wall.id} wall={wall} />
        ))}
      </ul>
    </section>
  )
}
