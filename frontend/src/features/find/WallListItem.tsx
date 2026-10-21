import { Link } from 'react-router-dom'

import { photosApi } from '@/api/photos'
import { routes } from '@/app/routes'
import { Chip } from '@/components/ui'
import { COVERAGE_META } from '@/domain/coverage'
import type { WallSummary } from '@/domain/types'
import { formatDate } from '@/lib/format'

interface WallListItemProps {
  wall: WallSummary
}

export function WallListItem({ wall }: WallListItemProps) {
  const coverage = COVERAGE_META[wall.coverage]
  return (
    <li>
      <Link
        to={routes.wall(wall.id)}
        className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 active:bg-stone-100"
      >
        <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
          {wall.photo_id ? (
            <img
              src={photosApi.thumbnailUrl(wall.photo_id)}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-stone-500">No photo</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{wall.label}</p>
          <p className="truncate text-sm text-stone-600">
            {wall.marker_count} {wall.marker_count === 1 ? 'item' : 'items'} · {wall.author}
          </p>
          <p className="text-xs text-stone-500">{formatDate(wall.observed_date)}</p>
        </div>
        <Chip tone={coverage.tone}>{coverage.label}</Chip>
      </Link>
    </li>
  )
}
