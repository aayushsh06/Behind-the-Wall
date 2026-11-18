import { http } from '@/api/client'
import type { Wall, WallInput, WallSummary } from '@/domain/types'

export const wallsApi = {
  list: (homeId: string) => http.get<WallSummary[]>(`/walls?home_id=${encodeURIComponent(homeId)}`),
  get: (id: string) => http.get<Wall>(`/walls/${id}`),
  create: (input: WallInput, homeId: string) => http.post<Wall>(`/walls?home_id=${encodeURIComponent(homeId)}`, input),
  update: (id: string, input: WallInput) => http.put<Wall>(`/walls/${id}`, input),
  remove: (id: string) => http.delete(`/walls/${id}`),
}
