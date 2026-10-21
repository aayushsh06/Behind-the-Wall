import type { Marker, WallCalibration } from '@/domain/types'
import { MarkerRow } from '@/features/find/MarkerRow'

interface MarkerListProps {
  markers: Marker[]
  calibration?: WallCalibration | null
  selectedId: string | null
  onSelect: (id: string) => void
}

export function MarkerList({ markers, calibration, selectedId, onSelect }: MarkerListProps) {
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
          calibration={calibration}
          selected={marker.id === selectedId}
          onSelect={() => onSelect(marker.id)}
        />
      ))}
    </ul>
  )
}
