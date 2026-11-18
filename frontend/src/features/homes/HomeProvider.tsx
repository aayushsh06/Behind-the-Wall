import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { homesApi } from '@/api/homes'
import { HomeContext } from '@/features/homes/homeContext'
import { ErrorMessage, Spinner } from '@/components/ui'
import { useSignedInUser } from '@/hooks/useAuth'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { queryKeys } from '@/hooks/queryKeys'

export function HomeProvider({ children }: { children: ReactNode }) {
  const user = useSignedInUser()
  const [selectedId, selectHome] = useLocalStorage(`btw.home.${user.id}`, '')
  const query = useQuery({
    queryKey: queryKeys.homes,
    queryFn: homesApi.list,
    refetchOnWindowFocus: true,
  })

  if (query.isPending) return <Spinner label="Loading homes" />
  if (query.isError) return <ErrorMessage error={query.error} />

  const home = query.data.find((item) => item.id === selectedId) ?? query.data[0] ?? null
  return (
    <HomeContext.Provider value={{ homes: query.data, home, selectHome }}>
      {children}
    </HomeContext.Provider>
  )
}

