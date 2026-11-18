import { useMutation, useQueryClient } from '@tanstack/react-query'

import { seedApi } from '@/api/seed'
import { queryKeys } from '@/hooks/queryKeys'
import { useHome } from '@/features/homes/homeContext'

export function useSeedSampleHome() {
  const { home } = useHome()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!home) throw new Error('Choose a home first')
      return seedApi.sampleHome(home.id)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.walls }),
  })
}
