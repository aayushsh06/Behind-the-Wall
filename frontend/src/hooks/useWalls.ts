import { useQuery } from '@tanstack/react-query'

import { wallsApi } from '@/api/walls'
import { queryKeys } from '@/hooks/queryKeys'
import { useHome } from '@/features/homes/homeContext'

export function useWalls() {
  const { home } = useHome()
  return useQuery({
    queryKey: queryKeys.wallsForHome(home?.id ?? null),
    queryFn: () => home ? wallsApi.list(home.id) : Promise.resolve([]),
  })
}
