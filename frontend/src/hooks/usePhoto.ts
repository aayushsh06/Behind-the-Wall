import { useQuery } from '@tanstack/react-query'

import { photosApi } from '@/api/photos'
import { queryKeys } from '@/hooks/queryKeys'

export function usePhoto(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.photo(id ?? ''),
    queryFn: () => photosApi.meta(id!),
    enabled: Boolean(id),
    staleTime: Infinity,
  })
}
