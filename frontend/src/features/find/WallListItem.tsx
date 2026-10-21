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
        className="group flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3 shadow-card transition-colors hover:border-line-strong active:bg-surface-2"
      >
        <div className="size-[68px] shrink-0 overflow-hidden rounded-xl bg-surface-3 ring-1 ring-line">
          {wall.photo_id ? (
            <img
              src={photosApi.thumbnailUrl(wall.photo_id, wall.updated_at)}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[11px] text-fg-faint">No photo</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">{wall.label}</p>
          <p className="truncate text-[13px] text-fg-muted">
            {wall.marker_count} {wall.marker_count === 1 ? 'item' : 'items'} · {wall.author}
          </p>
          <p className="mt-0.5 text-xs text-fg-faint">{formatDate(wall.observed_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone={coverage.tone}>{coverage.label}</Chip>
          <svg
            aria-hidden="true"
            className="text-fg-faint transition-colors group-hover:text-fg-muted"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>
    </li>
  )
}
