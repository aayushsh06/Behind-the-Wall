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
      {label ? <span className="mb-1.5 block text-[13px] font-medium text-fg-muted">{label}</span> : null}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          'rounded-xl border border-line bg-surface-2 p-1',
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
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
                selected ? 'bg-surface-3 text-fg shadow-card' : 'text-fg-muted hover:text-fg',
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
