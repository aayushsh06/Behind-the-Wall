import { SectionHeading } from '@/components/ui'
import { WallListItem } from '@/features/find/WallListItem'
import type { RoomGroupData } from '@/features/find/useWallSearch'

export function RoomGroup({ room, walls }: RoomGroupData) {
  const id = `room-${room.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <section aria-labelledby={id}>
      <SectionHeading id={id} aside={`${walls.length} ${walls.length === 1 ? 'wall' : 'walls'}`}>
        {room}
      </SectionHeading>
      <ul className="flex flex-col gap-2">
        {walls.map((wall) => (
          <WallListItem key={wall.id} wall={wall} />
        ))}
      </ul>
    </section>
  )
}
