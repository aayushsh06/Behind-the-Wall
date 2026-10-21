import { useMemo } from 'react'

import { useWalls } from '@/hooks/useWalls'

/** Distinct room names already in use, for the room autocomplete. */
export function useKnownRooms(): string[] {
  const walls = useWalls()
  return useMemo(() => [...new Set((walls.data ?? []).map((w) => w.room))].sort(), [walls.data])
}
