import { useMutation } from '@tanstack/react-query'

import { photosApi } from '@/api/photos'

export function useUploadPhoto() {
  return useMutation({ mutationFn: (file: File | Blob) => photosApi.upload(file) })
}
