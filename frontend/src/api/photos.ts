import { apiUrl, http } from '@/api/client'
import type { Photo } from '@/domain/types'

/**
 * Photo bytes can be rewritten under the same id (the sample-home seed does this), so
 * image URLs carry a version derived from the owning record. A changed version is a
 * new URL to the browser, which sidesteps anything it cached for the old one.
 */
const withVersion = (path: string, version?: string) =>
  version ? `${path}?v=${encodeURIComponent(version)}` : path

export const photosApi = {
  upload: (file: File | Blob, filename = 'photo.jpg') => {
    const form = new FormData()
    form.append('file', file, filename)
    return http.postForm<Photo>('/photos', form)
  },
  meta: (id: string) => http.get<Photo>(`/photos/${id}/meta`),
  url: (id: string, version?: string) => withVersion(apiUrl(`/photos/${id}`), version),
  thumbnailUrl: (id: string, version?: string) =>
    withVersion(apiUrl(`/photos/${id}/thumbnail`), version),
}
