import { useState } from 'react'

import { Button, TextField } from '@/components/ui'
import type { Coverage, Region } from '@/domain/types'
import { CoverageSelector } from '@/features/capture/CoverageSelector'
import { UncoveredRegionEditor } from '@/features/capture/UncoveredRegionEditor'
import { validateDetails } from '@/features/capture/validation'
import type { DetailsErrors } from '@/features/capture/validation'
import type { DraftAction, WallDraft } from '@/features/capture/wallDraft'

interface DetailsStepProps {
  draft: WallDraft
  dispatch: React.Dispatch<DraftAction>
  knownRooms: string[]
  onBack: () => void
  onNext: () => void
}

export function DetailsStep({ draft, dispatch, knownRooms, onBack, onNext }: DetailsStepProps) {
  const [errors, setErrors] = useState<DetailsErrors>({})

  const setField = (field: 'room' | 'label' | 'author' | 'observedDate' | 'coverageNote') =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      dispatch({ type: 'setField', field, value: event.target.value })

  const handleNext = () => {
    const found = validateDetails(draft)
    setErrors(found)
    if (Object.keys(found).length === 0) onNext()
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Room"
        list="known-rooms"
        placeholder="Kitchen"
        autoComplete="off"
        value={draft.room}
        onChange={setField('room')}
        error={errors.room}
      />
      <datalist id="known-rooms">
        {knownRooms.map((room) => (
          <option key={room} value={room} />
        ))}
      </datalist>

      <TextField
        label="Wall"
        placeholder="Wall behind sink"
        hint="Name it the way someone would describe it standing in the room."
        value={draft.label}
        onChange={setField('label')}
        error={errors.label}
      />
      <TextField label="Recorded by" placeholder="Your name or company" value={draft.author} onChange={setField('author')} error={errors.author} />
      <TextField label="Date observed" type="date" value={draft.observedDate} onChange={setField('observedDate')} error={errors.observedDate} />

      <CoverageSelector
        value={draft.coverage}
        hasPhoto={draft.photo !== null}
        onChange={(coverage: Coverage) => dispatch({ type: 'setCoverage', coverage })}
      />

      {draft.coverage === 'partial' && draft.photo && draft.uncoveredRegion ? (
        <UncoveredRegionEditor
          photo={draft.photo}
          region={draft.uncoveredRegion}
          onChange={(region: Region) => dispatch({ type: 'setRegion', region })}
        />
      ) : null}

      {draft.coverage !== 'full' ? (
        <TextField
          multiline
          label="What was not inspected?"
          placeholder="Only the lower 3 ft was opened for the outlet."
          value={draft.coverageNote}
          onChange={setField('coverageNote')}
        />
      ) : null}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" fullWidth onClick={handleNext}>
          {draft.coverage === 'none' ? 'Next: notes' : 'Next: mark items'}
        </Button>
      </div>
    </div>
  )
}
