import { SectionHeading } from '@/components/ui'
import { WallListItem } from '@/features/find/WallListItem'
import type { RoomGroupData } from '@/features/find/useWallSearch'

interface RoomGroupProps extends RoomGroupData {
  /** Keeps heading ids unique when the same room name appears under several clients. */
  idPrefix?: string
}

export function RoomGroup({ room, walls, idPrefix = '' }: RoomGroupProps) {
  const id = `room-${idPrefix}-${room.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <section aria-labelledby={id}>
      <SectionHeading id={id} aside={`${walls.length} ${walls.length === 1 ? 'wall' : 'walls'}`}>
        {room}
      </SectionHeading>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {walls.map((wall) => (
          <WallListItem key={wall.id} wall={wall} />
        ))}
      </ul>
    </section>
  )
}
