import { photosApi } from '@/api/photos'
import { PhotoCanvas } from '@/components/photo'
import { Spinner } from '@/components/ui'
import type { Marker, Region, WallCalibration } from '@/domain/types'
import { usePhoto } from '@/hooks/usePhoto'

interface WallPhotoProps {
  photoId: string
  /** Owning record's updated_at; changes whenever the photo could have been rewritten. */
  version: string
  alt: string
  markers: Marker[]
  uncoveredRegion: Region | null
  calibration: WallCalibration | null
  selectedMarkerId: string | null
  onSelectMarker: (id: string) => void
}

/** Read-only photo with pins; loads the photo dimensions so the box is stable before paint. */
export function WallPhoto({
  photoId,
  version,
  alt,
  markers,
  uncoveredRegion,
  calibration,
  selectedMarkerId,
  onSelectMarker,
}: WallPhotoProps) {
  const photo = usePhoto(photoId)
  if (!photo.data) return <Spinner label="Loading photo" />

  return (
    <PhotoCanvas
      src={photosApi.url(photoId, version)}
      alt={alt}
      aspectRatio={photo.data.width / photo.data.height}
      markers={markers}
      uncoveredRegion={uncoveredRegion}
      calibration={calibration}
      selectedMarkerId={selectedMarkerId}
      onSelectMarker={onSelectMarker}
    />
  )
}
