import { describe, expect, it } from 'vitest'

import { draftReducer, draftToInput, emptyDraft } from '@/features/capture/wallDraft'

describe('drawing a straight line', () => {
  it('adds a line item with both ends, unselected so the photo stays visible', () => {
    const draft = draftReducer(emptyDraft(), {
      type: 'addLineMarker',
      start: { x: 0.25, y: 0.1 },
      end: { x: 0.25, y: 0.9 },
      utility: 'framing',
    })
    expect(draft.markers).toHaveLength(1)
    expect(draft.markers[0]).toMatchObject({ kind: 'line', type: 'framing', x: 0.25, y: 0.1, x2: 0.25, y2: 0.9 })
    expect(draft.selectedMarkerId).toBeNull()
    expect(draftToInput(draft).markers[0]).toMatchObject({ kind: 'line', x2: 0.25, y2: 0.9 })
  })
})
