import { useState } from 'react'

import { photosApi } from '@/api/photos'
import { Button, ErrorMessage } from '@/components/ui'
import { PhotoPicker } from '@/features/capture/PhotoPicker'
import type { DraftPhoto } from '@/features/capture/wallDraft'
import { useUploadPhoto } from '@/hooks/useUploadPhoto'

interface PhotoStepProps {
  photo: DraftPhoto | null
  onPhoto: (photo: DraftPhoto) => void
  onClear: () => void
  onNext: () => void
}

export function PhotoStep({ photo, onPhoto, onClear, onNext }: PhotoStepProps) {
  const upload = useUploadPhoto()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handlePick = async (file: File) => {
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    try {
      const uploaded = await upload.mutateAsync(file)
      onPhoto({ id: uploaded.id, width: uploaded.width, height: uploaded.height, url: photosApi.url(uploaded.id) })
    } finally {
      URL.revokeObjectURL(localUrl)
      setPreviewUrl(null)
    }
  }

  const shownUrl = previewUrl ?? photo?.url ?? null

  return (
    <div className="flex flex-col gap-4">
      {shownUrl ? (
        <div className="relative overflow-hidden rounded-xl bg-stone-200">
          <img src={shownUrl} alt="Wall preview" className="block w-full" />
          {upload.isPending ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium">
              Uploading…
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl bg-stone-100 p-4 text-sm text-stone-600">
          Take a photo while the wall is open. You can skip this, but the record will then say the wall is
          undocumented.
        </p>
      )}

      {upload.isError ? <ErrorMessage error={upload.error} /> : null}

      <PhotoPicker onPick={(file) => void handlePick(file)} disabled={upload.isPending} />

      {photo ? (
        <Button variant="ghost" onClick={onClear} disabled={upload.isPending}>
          Remove photo
        </Button>
      ) : null}

      <Button variant={photo ? 'primary' : 'secondary'} size="lg" fullWidth onClick={onNext} disabled={upload.isPending}>
        {photo ? 'Next: details' : 'Skip photo'}
      </Button>
    </div>
  )
}
