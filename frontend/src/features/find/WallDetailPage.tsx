import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { exportsApi } from '@/api/exports'
import { routes } from '@/app/routes'
import { ErrorMessage, PageHeader, SectionHeading, Spinner } from '@/components/ui'
import { describeWallSize } from '@/domain/geometry'
import type { Wall } from '@/domain/types'
import { MarkerList } from '@/features/find/MarkerList'
import { WallActions } from '@/features/find/WallActions'
import { WallPhoto } from '@/features/find/WallPhoto'
import { clientOf } from '@/features/capture/useKnownRooms'
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
        backTo={readOnly ? routes.home() : routes.client(clientOf(wall)?.id ?? '')}
        backLabel={readOnly ? 'All walls' : (clientOf(wall)?.name ?? 'Back')}
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

      <WallFacts wall={wall} viewerId={user.id} />

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
            <SectionHeading>Items ({wall.markers.length})</SectionHeading>
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

const COVERAGE: Record<Wall['coverage'], { value: string; hatch: boolean }> = {
  full: { value: 'Whole wall', hatch: false },
  partial: { value: 'Part of the wall. The hatched area wasn’t opened.', hatch: true },
  none: { value: 'Not opened. Treat the whole wall as unknown.', hatch: true },
}

/** Everything known about the record, as a labelled list rather than one wrapping line. */
function WallFacts({ wall, viewerId }: { wall: Wall; viewerId: string }) {
  const coverage = COVERAGE[wall.coverage]
  const facts: { label: string; value: React.ReactNode; wide?: boolean }[] = [
    { label: 'Room', value: wall.room },
    { label: 'Recorded by', value: wall.author },
    { label: 'Observed', value: formatDate(wall.observed_date) },
  ]
  if (wall.owner && wall.owner.id !== viewerId) {
    facts.push({ label: 'Homeowner', value: `${wall.owner.name} (${wall.owner.email})`, wide: true })
  } else if (!wall.owner && wall.pending_owner_email) {
    facts.push({ label: 'Homeowner', value: `${wall.pending_owner_email} (invited)`, wide: true })
  }
  if (wall.owner?.id === viewerId && wall.created_by) {
    facts.push({ label: 'Added by', value: `${wall.created_by.name} (${wall.created_by.email})`, wide: true })
  }
  facts.push({
    label: 'Wall size',
    value: wall.calibration ? describeWallSize(wall.calibration) : 'Not recorded',
  })
  facts.push({
    label: 'Revision',
    value: `${wall.revision} · ${formatTimestamp(wall.updated_at)}${wall.last_edited_by ? ` by ${wall.last_edited_by.name}` : ''}`,
    wide: true,
  })
  facts.push({
    label: 'Inspected',
    wide: true,
    value: (
      <span className="flex items-start gap-2">
        {coverage.hatch ? (
          <span aria-hidden="true" className="hatch mt-0.5 inline-block size-4 shrink-0 rounded-sm ring-1 ring-inset ring-amber-300" />
        ) : null}
        <span>
          {coverage.value}
          {wall.coverage_note ? <span className="block text-fg-muted">{wall.coverage_note}</span> : null}
        </span>
      </span>
    ),
  })

  return (
    <dl className="-mt-2 mb-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-3 lg:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className={fact.wide ? 'col-span-2 sm:col-span-1' : undefined}>
          <dt className="text-[13px] text-fg-faint">{fact.label}</dt>
          <dd className="mt-0.5 break-words text-[15px] font-medium">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
