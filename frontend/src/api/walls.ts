import { http } from '@/api/client'
import type { Wall, WallInput, WallSummary } from '@/domain/types'

export const wallsApi = {
  list: () => http.get<WallSummary[]>('/walls'),
  get: (id: string) => http.get<Wall>(`/walls/${id}`),
  create: (input: WallInput) => http.post<Wall>('/walls', input),
  update: (id: string, input: WallInput) => http.put<Wall>(`/walls/${id}`, input),
  remove: (id: string) => http.delete(`/walls/${id}`),
}
