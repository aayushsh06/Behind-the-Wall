import { useMemo } from 'react'

import type { AccountBrief, WallSummary } from '@/domain/types'
import { useWalls } from '@/hooks/useWalls'

/** Distinct room names already in use, for the room autocomplete. */
export function useKnownRooms(): string[] {
  const walls = useWalls()
  return useMemo(() => [...new Set((walls.data ?? []).map((w) => w.room))].sort(), [walls.data])
}

/** Homeowners the signed-in tradesperson works with (including invited ones), by name. */
export function useKnownClients(): AccountBrief[] {
  const walls = useWalls()
  return useMemo(() => {
    const byKey = new Map<string, AccountBrief>()
    for (const wall of walls.data ?? []) {
      const client = clientOf(wall)
      if (client) byKey.set(client.id, client)
    }
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [walls.data])
}

/** The homeowner a wall is for; an invited email stands in until they sign up. */
export function clientOf(
  wall: Pick<WallSummary, 'owner' | 'pending_owner_email'>,
): (AccountBrief & { pending?: boolean }) | null {
  if (wall.owner) return wall.owner
  if (wall.pending_owner_email) {
    const email = wall.pending_owner_email
    return { id: `invite:${email}`, name: email, email, role: 'homeowner', pending: true }
  }
  return null
}
