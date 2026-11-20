import { useMemo, useState } from 'react'

import type { AccountBrief, WallSummary } from '@/domain/types'
import { clientOf } from '@/features/capture/useKnownRooms'

export interface RoomGroupData {
  room: string
  walls: WallSummary[]
}

/** A homeowner a tradesperson has recorded walls for, with those walls by room. */
export interface ClientGroupData {
  /** `pending` when the homeowner was invited and hasn't signed up yet. */
  client: AccountBrief & { pending?: boolean }
  rooms: RoomGroupData[]
  wallCount: number
}

function matches(wall: WallSummary, needle: string): boolean {
  const client = clientOf(wall)
  const owner = client ? `${client.name} ${client.email}` : ''
  const haystack = `${wall.room} ${wall.label} ${wall.author} ${owner}`.toLowerCase()
  return haystack.includes(needle)
}

function groupByRoom(walls: WallSummary[]): RoomGroupData[] {
  const byRoom = new Map<string, WallSummary[]>()
  for (const wall of walls) {
    const bucket = byRoom.get(wall.room) ?? []
    bucket.push(wall)
    byRoom.set(wall.room, bucket)
  }
  return [...byRoom.entries()].map(([room, items]) => ({ room, walls: items }))
}

function groupByClient(walls: WallSummary[]): ClientGroupData[] {
  const byClient = new Map<string, { client: ClientGroupData['client']; walls: WallSummary[] }>()
  for (const wall of walls) {
    const client = clientOf(wall)
    if (!client) continue
    const entry = byClient.get(client.id) ?? { client, walls: [] }
    entry.walls.push(wall)
    byClient.set(client.id, entry)
  }
  return [...byClient.values()]
    .sort((a, b) => a.client.name.localeCompare(b.client.name))
    .map(({ client, walls: items }) => ({ client, rooms: groupByRoom(items), wallCount: items.length }))
}

/**
 * Filters walls by a free-text query (room, wall, author, or client) and groups the
 * result by room, and by client for tradespeople, preserving order.
 */
export function useWallSearch(walls: WallSummary[] | undefined) {
  const [query, setQuery] = useState('')

  const { groups, clients } = useMemo(() => {
    if (!walls) return { groups: [], clients: [] }
    const needle = query.trim().toLowerCase()
    const filtered = needle ? walls.filter((w) => matches(w, needle)) : walls
    return { groups: groupByRoom(filtered), clients: groupByClient(filtered) }
  }, [walls, query])

  return { query, setQuery, groups, clients }
}
