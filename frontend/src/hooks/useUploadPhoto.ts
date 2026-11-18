import { useMutation } from '@tanstack/react-query'

import { photosApi } from '@/api/photos'
import { useHome } from '@/features/homes/homeContext'

export function useUploadPhoto() {
  const { home } = useHome()
  return useMutation({ mutationFn: (file: File | Blob) => {
    if (!home) throw new Error('Choose a home first')
    return photosApi.upload(file, home.id)
  } })
}
