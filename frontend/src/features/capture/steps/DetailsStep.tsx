import { useState } from 'react'

import { Button, TextField } from '@/components/ui'
import type { AccountBrief, Coverage, Region } from '@/domain/types'
import { CoverageSelector } from '@/features/capture/CoverageSelector'
import { UncoveredRegionEditor } from '@/features/capture/UncoveredRegionEditor'
import { validateDetails } from '@/features/capture/validation'
import type { DetailsErrors } from '@/features/capture/validation'
import type { DraftAction, WallDraft } from '@/features/capture/wallDraft'
import { useHomeownerStatus } from '@/hooks/useHomeownerStatus'

/**
 * Where the wall goes: a homeowner named by email (new wall), or the homeowner it
 * already belongs to, or is waiting for (editing).
 */
export type Destination =
  | { mode: 'choose'; knownClientEmails: string[] }
  | { mode: 'fixed'; owner: AccountBrief | null; pendingEmail: string | null }

interface DetailsStepProps {
  draft: WallDraft
  dispatch: React.Dispatch<DraftAction>
  knownRooms: string[]
  destination?: Destination
  onBack: () => void
  onNext: () => void
}

export function DetailsStep({ draft, dispatch, knownRooms, destination, onBack, onNext }: DetailsStepProps) {
  const [errors, setErrors] = useState<DetailsErrors>({})
  const choosing = destination?.mode === 'choose'
  const homeowner = useHomeownerStatus(draft.homeownerEmail, choosing)

  const setField = (field: 'room' | 'label' | 'author' | 'observedDate' | 'coverageNote' | 'homeownerEmail') =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      dispatch({ type: 'setField', field, value: event.target.value })
      // Clear this field's message as soon as it is edited; Next re-checks everything.
      setErrors((current) => (field in current ? { ...current, [field]: undefined } : current))
    }

  const handleNext = () => {
    // A tradesperson's email must be checked before moving on; until then it is 'unchecked'.
    const found = validateDetails(draft, choosing ? (homeowner.status ?? 'unchecked') : undefined)
    setErrors(found)
    if (Object.keys(found).length === 0) onNext()
  }

  return (
    <div className="flex flex-col gap-4">
      {destination?.mode === 'choose' ? (
        <>
          <TextField
            label="Homeowner's email"
            type="email"
            inputMode="email"
            autoComplete="off"
            list="known-clients"
            placeholder="name@example.com"
            hint="The wall is added to this homeowner's account, where they can view it as a PDF."
            value={draft.homeownerEmail}
            onChange={setField('homeownerEmail')}
            error={errors.homeownerEmail}
          />
          <datalist id="known-clients">
            {destination.knownClientEmails.map((email) => (
              <option key={email} value={email} />
            ))}
          </datalist>
          {homeowner.status === 'unconfirmed' ? (
            <p className="-mt-2 text-sm text-amber-800">
              This homeowner has signed up but hasn’t confirmed their email yet. The wall will be held until they do.
            </p>
          ) : null}
          {homeowner.status === 'registered' ? (
            <p className="-mt-2 text-sm text-green-700">This homeowner has an account. The wall goes straight to them.</p>
          ) : null}
          {homeowner.status === 'not_registered' ? (
            <label className="-mt-1 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--color-accent)]"
                checked={draft.inviteHomeowner}
                onChange={(event) => {
                  dispatch({ type: 'setInvite', invite: event.target.checked })
                  setErrors((current) => ({ ...current, homeownerEmail: undefined }))
                }}
              />
              <span>
                <span className="font-semibold">No one has signed up with this email yet.</span> Invite this homeowner.
                The wall will be saved and waiting in their account when they sign up with this email.
              </span>
            </label>
          ) : null}
        </>
      ) : null}
      {destination?.mode === 'fixed' && (destination.owner || destination.pendingEmail) ? (
        <p className="rounded-md border border-line bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          {destination.owner ? (
            <>
              In <strong className="font-semibold text-fg">{destination.owner.name}</strong>’s account (
              {destination.owner.email})
            </>
          ) : (
            <>
              Waiting for <strong className="font-semibold text-fg">{destination.pendingEmail}</strong> to sign up
            </>
          )}
        </p>
      ) : null}
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
