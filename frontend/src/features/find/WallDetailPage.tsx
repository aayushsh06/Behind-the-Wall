import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { routes } from '@/app/routes'
import { ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { CoverageBanner } from '@/features/find/CoverageBanner'
import { MarkerList } from '@/features/find/MarkerList'
import { WallPhoto } from '@/features/find/WallPhoto'
import { useWall } from '@/hooks/useWall'
import { formatDate } from '@/lib/format'

export function WallDetailPage() {
  const { id } = useParams<{ id: string }>()
  const wallQuery = useWall(id)
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)

  if (wallQuery.isPending) return <Spinner label="Loading wall" />
  if (wallQuery.isError) return <ErrorMessage error={wallQuery.error} />

  const wall = wallQuery.data
  const toggleMarker = (markerId: string) =>
    setSelectedMarkerId((current) => (current === markerId ? null : markerId))

  return (
    <>
      <PageHeader
        title={wall.label}
        subtitle={`${wall.room} · Recorded by ${wall.author} · ${formatDate(wall.observed_date)}`}
        backTo={routes.home()}
      />

      <div className="flex flex-col gap-4">
        <CoverageBanner coverage={wall.coverage} note={wall.coverage_note} />

        {wall.photo_id ? (
          <WallPhoto
            photoId={wall.photo_id}
            alt={`${wall.room} ${wall.label}`}
            markers={wall.markers}
            uncoveredRegion={wall.uncovered_region}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={toggleMarker}
          />
        ) : null}

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Items ({wall.markers.length})
          </h2>
          <MarkerList markers={wall.markers} selectedId={selectedMarkerId} onSelect={toggleMarker} />
        </section>

        {wall.notes ? (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Notes</h2>
            <p className="whitespace-pre-wrap rounded-xl border border-stone-200 bg-white p-3 text-sm">
              {wall.notes}
            </p>
          </section>
        ) : null}
      </div>
    </>
  )
}
