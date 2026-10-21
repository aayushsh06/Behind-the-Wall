import { useQuery } from '@tanstack/react-query'

import { wallsApi } from '@/api/walls'
import { queryKeys } from '@/hooks/queryKeys'

export function useWalls() {
  return useQuery({ queryKey: queryKeys.walls, queryFn: wallsApi.list })
}
