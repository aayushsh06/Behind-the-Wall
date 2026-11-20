import { cn } from '@/lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Optional swatch color shown before the label. */
  swatch?: string
}

interface SegmentedControlProps<T extends string> {
  label?: string
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div>
      {label ? <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span> : null}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          'rounded-md border border-line bg-surface-2 p-0.5',
          options.length > 4 ? 'grid grid-cols-3 gap-1' : 'flex',
        )}
      >
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded py-2 text-sm font-medium transition-colors',
                selected ? 'bg-surface text-fg shadow-card ring-1 ring-line' : 'text-fg-muted hover:text-fg',
              )}
            >
              {option.swatch ? (
                <span className="size-2.5 rounded-full" style={{ backgroundColor: option.swatch }} />
              ) : null}
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
