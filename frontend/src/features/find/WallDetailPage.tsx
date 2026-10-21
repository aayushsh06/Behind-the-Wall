import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { routes } from '@/app/routes'
import { ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { describeWallSize } from '@/domain/geometry'
import { CoverageBanner } from '@/features/find/CoverageBanner'
import { MarkerList } from '@/features/find/MarkerList'
import { WallActions } from '@/features/find/WallActions'
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

      <div className="flex flex-col gap-4 pb-16">
        <CoverageBanner coverage={wall.coverage} note={wall.coverage_note} />

        {wall.photo_id ? (
          <WallPhoto
            photoId={wall.photo_id}
            version={wall.updated_at}
            alt={`${wall.room} ${wall.label}`}
            markers={wall.markers}
            uncoveredRegion={wall.uncovered_region}
            calibration={wall.calibration}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={toggleMarker}
          />
        ) : null}

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Items ({wall.markers.length})
            </h2>
            <span className="text-xs text-stone-500">
              {wall.calibration ? `Wall ${describeWallSize(wall.calibration)}` : 'Wall size not recorded'}
            </span>
          </div>
          <MarkerList
            markers={wall.markers}
            calibration={wall.calibration}
            selectedId={selectedMarkerId}
            onSelect={toggleMarker}
          />
          {wall.calibration ? (
            <p className="mt-2 text-xs text-stone-500">
              Positions are computed from the wall corners marked in the photo and are approximate.
            </p>
          ) : null}
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

      <WallActions wallId={wall.id} title={`${wall.room} · ${wall.label}`} />
    </>
  )
}
