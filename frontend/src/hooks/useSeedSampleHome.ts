import { useMutation, useQueryClient } from '@tanstack/react-query'

import { seedApi } from '@/api/seed'
import { queryKeys } from '@/hooks/queryKeys'

export function useSeedSampleHome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: seedApi.sampleHome,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.walls }),
  })
}
