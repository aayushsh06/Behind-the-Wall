import { useQuery } from '@tanstack/react-query'

import { wallsApi } from '@/api/walls'
import { queryKeys } from '@/hooks/queryKeys'

export function useWall(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wall(id ?? ''),
    queryFn: () => wallsApi.get(id!),
    enabled: Boolean(id),
  })
}
