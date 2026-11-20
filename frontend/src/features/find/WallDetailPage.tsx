import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { exportsApi } from '@/api/exports'
import { routes } from '@/app/routes'
import { ErrorMessage, PageHeader, SectionHeading, Spinner } from '@/components/ui'
import { describeWallSize } from '@/domain/geometry'
import type { Wall } from '@/domain/types'
import { CoverageBanner } from '@/features/find/CoverageBanner'
import { MarkerList } from '@/features/find/MarkerList'
import { WallActions } from '@/features/find/WallActions'
import { WallPhoto } from '@/features/find/WallPhoto'
import { InvitePanel } from '@/features/handoff/InvitePanel'
import { useSignedInUser } from '@/hooks/useAuth'
import { useWall } from '@/hooks/useWall'
import { formatDate, formatTimestamp } from '@/lib/format'

export function WallDetailPage() {
  const { id } = useParams<{ id: string }>()
  const wallQuery = useWall(id)
  const user = useSignedInUser()
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)

  if (wallQuery.isPending) return <Spinner label="Loading wall" />
  if (wallQuery.isError) return <ErrorMessage error={wallQuery.error} />

  const wall = wallQuery.data
  const readOnly = user.role === 'homeowner'
  const title = `${wall.room} · ${wall.label}`
  const toggleMarker = (markerId: string) =>
    setSelectedMarkerId((current) => (current === markerId ? null : markerId))

  return (
    <>
      <PageHeader
        title={wall.label}
        subtitle={`${wall.room} · Recorded by ${wall.author} · ${formatDate(wall.observed_date)}`}
        backTo={routes.home()}
        action={
          <WallActions
            wallId={wall.id}
            title={title}
            readOnly={readOnly}
            canEdit={wall.can_edit}
            canDelete={wall.can_delete}
          />
        }
      />

      <RecordContext wall={wall} viewerId={user.id} />

      {wall.pending_owner_email && wall.created_by?.id === user.id ? (
        <div className="mb-6">
          <InvitePanel email={wall.pending_owner_email} wallTitle={title} senderName={user.name} />
        </div>
      ) : null}

      {readOnly ? (
        <iframe
          title={`PDF of ${title}`}
          src={exportsApi.url(wall.id, 'pdf')}
          // Rebuilt from the latest save; the revision in the key reloads it after an edit.
          key={wall.revision}
          className="hidden h-[80vh] w-full rounded-2xl border border-line bg-surface lg:block"
        />
      ) : null}

      <div
        className={
          'grid gap-6 pb-16 md:pb-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start' +
          (readOnly ? ' lg:hidden' : '')
        }
      >
        <div className="flex flex-col gap-4">
          <CoverageBanner coverage={wall.coverage} note={wall.coverage_note} />
          {wall.photo_id ? (
            <WallPhoto
              photoId={wall.photo_id}
              version={wall.updated_at}
              alt={title}
              markers={wall.markers}
              uncoveredRegion={wall.uncovered_region}
              calibration={wall.calibration}
              selectedMarkerId={selectedMarkerId}
              onSelectMarker={toggleMarker}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <SectionHeading
              aside={wall.calibration ? `Wall ${describeWallSize(wall.calibration)}` : 'Wall size not recorded'}
            >
              Items ({wall.markers.length})
            </SectionHeading>
            <MarkerList
              markers={wall.markers}
              calibration={wall.calibration}
              selectedId={selectedMarkerId}
              onSelect={toggleMarker}
            />
            {wall.calibration ? (
              <p className="mt-2.5 text-xs text-fg-faint">
                Positions are computed from the wall corners marked in the photo and are approximate.
              </p>
            ) : null}
          </section>

          {wall.notes ? (
            <section>
              <SectionHeading>Notes</SectionHeading>
              <p className="whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-fg-muted">
                {wall.notes}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </>
  )
}

/** Whose home, who added it, and which revision this is. */
function RecordContext({ wall, viewerId }: { wall: Wall; viewerId: string }) {
  const lines: React.ReactNode[] = []
  if (wall.owner && wall.owner.id !== viewerId) {
    lines.push(
      <>
        In <span className="font-medium text-fg">{wall.owner.name}</span>’s account ({wall.owner.email})
      </>,
    )
  }
  if (wall.owner?.id === viewerId && wall.created_by) {
    lines.push(
      <>
        Added to your account by <span className="font-medium text-fg">{wall.created_by.name}</span> (
        {wall.created_by.email})
      </>,
    )
  }
  const editor = wall.last_edited_by ? ` by ${wall.last_edited_by.name}` : ''
  lines.push(`Revision ${wall.revision} · Updated ${formatTimestamp(wall.updated_at)}${editor}`)

  return (
    <div className="-mt-3 mb-5 flex flex-col gap-0.5 text-sm text-fg-muted">
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  )
}
