import type { UtilityType } from '@/domain/types'
import { UTILITY_TYPES } from '@/domain/types'
import { UTILITY_META } from '@/domain/utility'
import { cn } from '@/lib/cn'

export type MarkerTool = 'draw' | 'point'

interface MarkerToolbarProps {
  utility: UtilityType
  onUtilityChange: (utility: UtilityType) => void
  tool: MarkerTool
  onToolChange: (tool: MarkerTool) => void
  snap: boolean
  onSnapChange: (snap: boolean) => void
}

const TOOLS: { value: MarkerTool; label: string }[] = [
  { value: 'draw', label: 'Draw a run' },
  { value: 'point', label: 'Place a point' },
]

/** Choose what is being marked, then how: trace a run freehand, or tap a single spot. */
export function MarkerToolbar({ utility, onUtilityChange, tool, onToolChange, snap, onSnapChange }: MarkerToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">What are you marking?</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {UTILITY_TYPES.map((type) => {
            const selected = type === utility
            return (
              <button
                key={type}
                type="button"
                aria-pressed={selected}
                onClick={() => onUtilityChange(type)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold ring-1 ring-inset transition-colors',
                  selected ? 'bg-ink text-white ring-ink' : 'bg-surface text-fg ring-line-strong hover:bg-surface-2',
                )}
              >
                <span
                  className="size-2.5 rounded-full ring-2 ring-white/80"
                  style={{ backgroundColor: UTILITY_META[type].hex }}
                />
                {UTILITY_META[type].label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="radiogroup" aria-label="Tool" className="flex rounded-full bg-surface-2 p-1">
          {TOOLS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={tool === option.value}
              onClick={() => onToolChange(option.value)}
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:flex-none',
                tool === option.value ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {tool === 'draw' ? (
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={snap}
              onChange={(event) => onSnapChange(event.target.checked)}
              className="size-4 accent-[var(--color-ink)]"
            />
            Snap to the photo
          </label>
        ) : null}
      </div>
    </div>
  )
}
