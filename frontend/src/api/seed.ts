import { http } from '@/api/client'

export const seedApi = {
  sampleHome: (homeId: string) => http.post<{ wall_ids: string[] }>(`/seed/sample-home?home_id=${encodeURIComponent(homeId)}`, {}),
}
