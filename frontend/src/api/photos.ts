import { apiUrl, http } from '@/api/client'
import type { Photo } from '@/domain/types'

export const photosApi = {
  upload: (file: File | Blob, filename = 'photo.jpg') => {
    const form = new FormData()
    form.append('file', file, filename)
    return http.postForm<Photo>('/photos', form)
  },
  meta: (id: string) => http.get<Photo>(`/photos/${id}/meta`),
  url: (id: string) => apiUrl(`/photos/${id}`),
  thumbnailUrl: (id: string) => apiUrl(`/photos/${id}/thumbnail`),
}
