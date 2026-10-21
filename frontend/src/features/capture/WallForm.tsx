import { useState } from 'react'

import { StepIndicator } from '@/features/capture/StepIndicator'
import type { CaptureStep } from '@/features/capture/captureSteps'
import { DetailsStep } from '@/features/capture/steps/DetailsStep'
import { DimensionsStep } from '@/features/capture/steps/DimensionsStep'
import { MarkersStep } from '@/features/capture/steps/MarkersStep'
import { PhotoStep } from '@/features/capture/steps/PhotoStep'
import { useWallDraft } from '@/features/capture/useWallDraft'
import type { WallDraft } from '@/features/capture/wallDraft'
import { draftToInput } from '@/features/capture/wallDraft'
import type { WallInput } from '@/domain/types'

interface WallFormProps {
  initialDraft: WallDraft
  knownRooms: string[]
  submitLabel: string
  submitting: boolean
  submitError: unknown
  onSubmit: (input: WallInput, draft: WallDraft) => void
}

/** Three-step capture form shared by the new-wall and edit-wall pages. */
export function WallForm({ initialDraft, knownRooms, submitLabel, submitting, submitError, onSubmit }: WallFormProps) {
  const [draft, dispatch] = useWallDraft(initialDraft)
  const [step, setStep] = useState<CaptureStep>('photo')

  return (
    <>
      <StepIndicator current={step} />
      {step === 'photo' ? (
        <PhotoStep
          photo={draft.photo}
          onPhoto={(photo) => dispatch({ type: 'setPhoto', photo })}
          onClear={() => dispatch({ type: 'clearPhoto' })}
          onNext={() => setStep(draft.photo ? 'dimensions' : 'details')}
        />
      ) : null}
      {step === 'dimensions' ? (
        <DimensionsStep
          draft={draft}
          dispatch={dispatch}
          onBack={() => setStep('photo')}
          onNext={() => setStep('details')}
        />
      ) : null}
      {step === 'details' ? (
        <DetailsStep
          draft={draft}
          dispatch={dispatch}
          knownRooms={knownRooms}
          onBack={() => setStep(draft.photo ? 'dimensions' : 'photo')}
          onNext={() => setStep('markers')}
        />
      ) : null}
      {step === 'markers' ? (
        <MarkersStep
          draft={draft}
          dispatch={dispatch}
          submitting={submitting}
          submitError={submitError}
          submitLabel={submitLabel}
          onBack={() => setStep('details')}
          onSubmit={() => onSubmit(draftToInput(draft), draft)}
        />
      ) : null}
    </>
  )
}
