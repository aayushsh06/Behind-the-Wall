import { useQuery } from '@tanstack/react-query'

import { useWalls } from '@/hooks/useWalls'

/** Summary numbers for the settings screen: wall count and photo count. */
export function useRecordStats() {
  const walls = useWalls()
  const total = walls.data?.length ?? 0
  const withPhoto = walls.data?.filter((w) => w.photo_id).length ?? 0
  return { total, withPhoto, isPending: walls.isPending }
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      return (await response.json()) as { status: string }
    },
    retry: 0,
  })
}
