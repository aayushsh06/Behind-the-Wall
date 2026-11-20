import { UTILITY_META } from '@/domain/utility'

/** The marker colours shown on the landing page, taken from the app's own palette. */
export const LEGEND = (['water', 'pipe', 'wire', 'framing'] as const).map((type) => ({
  label: UTILITY_META[type].label,
  color: UTILITY_META[type].hex,
}))
