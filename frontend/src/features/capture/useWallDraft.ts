import { useReducer } from 'react'

import { draftReducer, emptyDraft } from '@/features/capture/wallDraft'
import type { WallDraft } from '@/features/capture/wallDraft'

export function useWallDraft(initial?: WallDraft) {
  return useReducer(draftReducer, initial ?? emptyDraft())
}
