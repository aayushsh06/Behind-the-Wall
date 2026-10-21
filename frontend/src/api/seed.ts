import { http } from '@/api/client'

export const seedApi = {
  sampleHome: () => http.post<{ wall_ids: string[] }>('/seed/sample-home', {}),
}
