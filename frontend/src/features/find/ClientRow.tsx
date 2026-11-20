import { Link } from 'react-router-dom'

import { photosApi } from '@/api/photos'
import { routes } from '@/app/routes'
import { Arrow } from '@/components/ui'
import type { ClientGroupData } from '@/features/find/useWallSearch'
import { formatTimestamp } from '@/lib/format'

function initials(name: string): string {
  const parts = name.includes('@') ? [name] : name.split(/\s+/)
  return parts
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/** One client in a tradesperson's list: who, how much, how recent. Opens their walls. */
export function ClientRow({ client, rooms, wallCount, updatedAt, previews }: ClientGroupData) {
  return (
    <li className="min-w-0">
      <Link
        to={routes.client(client.id)}
        className="group flex items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-inset ring-line transition-[box-shadow,transform] duration-150 ease-out hover:shadow-card hover:ring-line-strong motion-safe:active:scale-[0.99] sm:p-5"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-ink ring-1 ring-inset ring-brand/40">
          {initials(client.name) || '•'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-tight">{client.name}</span>
          {client.pending ? (
            <span className="block truncate text-sm text-amber-800">Invited · hasn’t signed up yet</span>
          ) : (
            <span className="block truncate text-sm text-fg-muted">{client.email}</span>
          )}
          <span className="mt-1 block text-[13px] text-fg-faint">
            {wallCount} {wallCount === 1 ? 'wall' : 'walls'} · {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
            {updatedAt ? ` · updated ${formatTimestamp(updatedAt)}` : ''}
          </span>
        </span>
        <span className="hidden shrink-0 -space-x-3 sm:flex" aria-hidden="true">
          {previews.map((wall) => (
            <img
              key={wall.id}
              src={photosApi.thumbnailUrl(wall.photo_id!, wall.updated_at)}
              alt=""
              loading="lazy"
              className="size-12 rounded-xl object-cover ring-2 ring-surface"
            />
          ))}
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg transition-colors group-hover:bg-ink group-hover:text-white">
          <Arrow />
        </span>
      </Link>
    </li>
  )
}
