import { Link } from 'react-router-dom'

import { photosApi } from '@/api/photos'
import { routes } from '@/app/routes'
import { Arrow } from '@/components/ui'
import type { WallSummary } from '@/domain/types'
import { formatDate } from '@/lib/format'

interface WallListItemProps {
  wall: WallSummary
}

/** Photo-first card: the wall itself is the most recognisable thing about a record. */
export function WallListItem({ wall }: WallListItemProps) {
  return (
    <li className="min-w-0">
      <Link
        to={routes.wall(wall.id)}
        className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-inset ring-line transition-[box-shadow,transform] duration-150 ease-out hover:shadow-card hover:ring-line-strong motion-safe:active:scale-[0.99]"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
          {wall.photo_id ? (
            <img
              src={photosApi.thumbnailUrl(wall.photo_id, wall.updated_at)}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="relative flex size-full items-center justify-center">
              <span aria-hidden="true" className="hatch absolute inset-0 opacity-50" />
              <span className="eyebrow relative rounded bg-surface px-2 py-1 text-fg-muted">No photo</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight">{wall.label}</p>
            <p className="mt-0.5 truncate text-[13px] text-fg-muted">
              {wall.marker_count} {wall.marker_count === 1 ? 'item' : 'items'} · {wall.author}
            </p>
            <p className="eyebrow mt-2 text-fg-faint">{formatDate(wall.observed_date)}</p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg transition-[background-color,color,transform] duration-150 group-hover:bg-ink group-hover:text-white motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5">
            <Arrow />
          </span>
        </div>
      </Link>
    </li>
  )
}
