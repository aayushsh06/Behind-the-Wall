import { useMemo, useState } from 'react'

import type { WallSummary } from '@/domain/types'

export interface RoomGroupData {
  room: string
  walls: WallSummary[]
}

function matches(wall: WallSummary, needle: string): boolean {
  const haystack = `${wall.room} ${wall.label} ${wall.author}`.toLowerCase()
  return haystack.includes(needle)
}

/** Filters walls by a free-text query and groups the result by room, preserving order. */
export function useWallSearch(walls: WallSummary[] | undefined) {
  const [query, setQuery] = useState('')

  const groups = useMemo<RoomGroupData[]>(() => {
    if (!walls) return []
    const needle = query.trim().toLowerCase()
    const filtered = needle ? walls.filter((w) => matches(w, needle)) : walls
    const byRoom = new Map<string, WallSummary[]>()
    for (const wall of filtered) {
      const bucket = byRoom.get(wall.room) ?? []
      bucket.push(wall)
      byRoom.set(wall.room, bucket)
    }
    return [...byRoom.entries()].map(([room, items]) => ({ room, walls: items }))
  }, [walls, query])

  return { query, setQuery, groups }
}
