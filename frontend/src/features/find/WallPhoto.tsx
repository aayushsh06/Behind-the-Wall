import { photosApi } from '@/api/photos'
import { PhotoCanvas } from '@/components/photo'
import { Spinner } from '@/components/ui'
import type { Marker, Region } from '@/domain/types'
import { usePhoto } from '@/hooks/usePhoto'

interface WallPhotoProps {
  photoId: string
  alt: string
  markers: Marker[]
  uncoveredRegion: Region | null
  selectedMarkerId: string | null
  onSelectMarker: (id: string) => void
}

/** Read-only photo with pins; loads the photo dimensions so the box is stable before paint. */
export function WallPhoto({
  photoId,
  alt,
  markers,
  uncoveredRegion,
  selectedMarkerId,
  onSelectMarker,
}: WallPhotoProps) {
  const photo = usePhoto(photoId)
  if (!photo.data) return <Spinner label="Loading photo" />

  return (
    <PhotoCanvas
      src={photosApi.url(photoId)}
      alt={alt}
      aspectRatio={photo.data.width / photo.data.height}
      markers={markers}
      uncoveredRegion={uncoveredRegion}
      selectedMarkerId={selectedMarkerId}
      onSelectMarker={onSelectMarker}
    />
  )
}
