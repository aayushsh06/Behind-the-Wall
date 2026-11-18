import { createContext, useContext } from 'react'

import type { Home } from '@/api/homes'

interface HomeContextValue {
  homes: Home[]
  home: Home | null
  selectHome: (id: string) => void
}

export const HomeContext = createContext<HomeContextValue | null>(null)

export function useHome() {
  const context = useContext(HomeContext)
  if (!context) throw new Error('useHome requires HomeProvider')
  return context
}
