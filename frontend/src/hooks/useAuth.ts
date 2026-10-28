import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { authApi } from '@/api/auth'
import type { LoginInput, RegisterInput } from '@/api/auth'
import { routes } from '@/app/routes'
import type { User } from '@/domain/types'
import { queryKeys } from '@/hooks/queryKeys'

export function useCurrentUser() {
  return useQuery({ queryKey: queryKeys.me, queryFn: authApi.me, retry: 0, staleTime: Infinity })
}

/** The user inside signed-in screens. RequireAuth guarantees it is loaded. */
export function useSignedInUser(): User {
  const { data } = useCurrentUser()
  if (!data) throw new Error('useSignedInUser used outside RequireAuth')
  return data
}

/** Drop everything cached for the previous user and record who is signed in now. */
export function setSignedInUser(queryClient: QueryClient, user: User | null) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.me[0] })
  queryClient.setQueryData(queryKeys.me, user)
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (user) => setSignedInUser(queryClient, user),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (user) => setSignedInUser(queryClient, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Leave first, so the next sign-in starts at the wall list rather than returning here.
      void navigate(routes.welcome(), { replace: true })
      setSignedInUser(queryClient, null)
    },
  })
}
