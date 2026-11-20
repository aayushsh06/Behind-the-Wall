import { useWalls } from '@/hooks/useWalls'

/** Summary numbers for the account screen: wall count and photo count. */
export function useRecordStats() {
  const walls = useWalls()
  const total = walls.data?.length ?? 0
  const withPhoto = walls.data?.filter((w) => w.photo_id).length ?? 0
  return { total, withPhoto, isPending: walls.isPending }
}
