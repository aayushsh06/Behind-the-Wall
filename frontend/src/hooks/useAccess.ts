import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { accessApi, invitesApi } from '@/api/access'
import type { AccessDecision } from '@/api/access'
import { queryKeys } from '@/hooks/queryKeys'

export function useAccessRequests() {
  return useQuery({ queryKey: queryKeys.access, queryFn: accessApi.list })
}

export function useRequestAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, message }: { email: string; message: string }) => accessApi.request(email, message),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.access }),
  })
}

export function useDecideAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: AccessDecision }) => accessApi.decide(id, decision),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.access }),
  })
}

export function useSendInvite() {
  return useMutation({ mutationFn: (email: string) => invitesApi.send(email) })
}
