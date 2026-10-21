import { useMutation, useQueryClient } from '@tanstack/react-query'

import { wallsApi } from '@/api/walls'
import type { WallInput } from '@/domain/types'
import { queryKeys } from '@/hooks/queryKeys'

export function useCreateWall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WallInput) => wallsApi.create(input),
    onSuccess: (wall) => {
      queryClient.setQueryData(queryKeys.wall(wall.id), wall)
      void queryClient.invalidateQueries({ queryKey: queryKeys.walls })
    },
  })
}

export function useUpdateWall(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WallInput) => wallsApi.update(id, input),
    onSuccess: (wall) => {
      queryClient.setQueryData(queryKeys.wall(wall.id), wall)
      void queryClient.invalidateQueries({ queryKey: queryKeys.walls })
    },
  })
}

export function useDeleteWall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => wallsApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.wall(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.walls })
    },
  })
}
