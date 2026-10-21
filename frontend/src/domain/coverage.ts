import type { Coverage } from '@/domain/types'

export type Tone = 'success' | 'warning' | 'danger'

export interface CoverageMeta {
  label: string
  /** One-line explanation shown on the record view. */
  description: string
  tone: Tone
}

export const COVERAGE_META: Record<Coverage, CoverageMeta> = {
  full: {
    label: 'Full',
    description: 'Entire wall documented.',
    tone: 'success',
  },
  partial: {
    label: 'Partial',
    description: 'Part of this wall is undocumented. Unmarked areas are unknown.',
    tone: 'warning',
  },
  none: {
    label: 'None',
    description: 'No photo or markers for this wall. Treat the whole wall as unknown.',
    tone: 'danger',
  },
}
