import type { UtilityType } from '@/domain/types'

export interface UtilityMeta {
  label: string
  /** Tailwind color token defined in index.css via @theme. */
  colorClass: string
  hex: string
}

export const UTILITY_META: Record<UtilityType, UtilityMeta> = {
  pipe: { label: 'Pipe', colorClass: 'bg-pipe', hex: '#1f6feb' },
  wire: { label: 'Wire', colorClass: 'bg-wire', hex: '#d4a017' },
  framing: { label: 'Framing', colorClass: 'bg-framing', hex: '#8b5a2b' },
  other: { label: 'Other', colorClass: 'bg-other', hex: '#6b6b6b' },
}

export function utilityLabel(type: UtilityType): string {
  return UTILITY_META[type].label
}
