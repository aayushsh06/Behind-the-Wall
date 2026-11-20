import { useMutation } from '@tanstack/react-query'

import { photosApi } from '@/api/photos'
import { shrinkImage } from '@/lib/shrinkImage'

export function useUploadPhoto() {
  return useMutation({
    mutationFn: async (file: File | Blob) =>
      photosApi.upload(file instanceof File ? await shrinkImage(file) : file),
  })
}
