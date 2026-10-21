import type { Marker } from '@/domain/types'
import { MarkerRow } from '@/features/find/MarkerRow'

interface MarkerListProps {
  markers: Marker[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function MarkerList({ markers, selectedId, onSelect }: MarkerListProps) {
  if (markers.length === 0) {
    return <p className="text-sm text-stone-600">No items recorded for this wall.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {markers.map((marker, index) => (
        <MarkerRow
          key={marker.id}
          index={index + 1}
          marker={marker}
          selected={marker.id === selectedId}
          onSelect={() => onSelect(marker.id)}
        />
      ))}
    </ul>
  )
}
