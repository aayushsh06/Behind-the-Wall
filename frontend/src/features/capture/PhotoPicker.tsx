import { useRef } from 'react'

import { Button } from '@/components/ui'

interface PhotoPickerProps {
  onPick: (file: File) => void
  disabled?: boolean
}

/** Two hidden file inputs: one opens the camera directly, one opens the photo library. */
export function PhotoPicker({ onPick, disabled }: PhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onPick(file)
    event.target.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleChange} />
      <input ref={libraryRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <Button size="lg" fullWidth disabled={disabled} onClick={() => cameraRef.current?.click()}>
        Take photo
      </Button>
      <Button variant="secondary" fullWidth disabled={disabled} onClick={() => libraryRef.current?.click()}>
        Choose from library
      </Button>
    </div>
  )
}
