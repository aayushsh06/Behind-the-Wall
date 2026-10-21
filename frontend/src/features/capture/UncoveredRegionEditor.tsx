import { PhotoCanvas } from '@/components/photo'
import type { Region } from '@/domain/types'
import type { DraftPhoto } from '@/features/capture/wallDraft'
import { cn } from '@/lib/cn'

interface Preset {
  label: string
  region: Region
}

const PRESETS: readonly Preset[] = [
  { label: 'Top half', region: { x: 0, y: 0, width: 1, height: 0.5 } },
  { label: 'Bottom half', region: { x: 0, y: 0.5, width: 1, height: 0.5 } },
  { label: 'Left half', region: { x: 0, y: 0, width: 0.5, height: 1 } },
  { label: 'Right half', region: { x: 0.5, y: 0, width: 0.5, height: 1 } },
]

interface UncoveredRegionEditorProps {
  photo: DraftPhoto
  region: Region
  onChange: (region: Region) => void
}

const sameRegion = (a: Region, b: Region) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

/** Choose which part of the photo was NOT inspected: presets plus fine-tuning sliders. */
export function UncoveredRegionEditor({ photo, region, onChange }: UncoveredRegionEditorProps) {
  const set = (changes: Partial<Region>) => {
    const next = { ...region, ...changes }
    next.width = Math.min(next.width, 1 - next.x)
    next.height = Math.min(next.height, 1 - next.y)
    onChange(next)
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium text-stone-700">Which part was not inspected?</legend>
      <PhotoCanvas src={photo.url} alt="Wall" aspectRatio={photo.width / photo.height} markers={[]} uncoveredRegion={region} />
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.region)}
            className={cn(
              'rounded-xl border py-2 text-sm font-medium',
              sameRegion(preset.region, region) ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-stone-600">
        <RangeField label="Left" value={region.x} onChange={(x) => set({ x })} />
        <RangeField label="Top" value={region.y} onChange={(y) => set({ y })} />
        <RangeField label="Width" value={region.width} min={0.05} onChange={(width) => set({ width })} />
        <RangeField label="Height" value={region.height} min={0.05} onChange={(height) => set({ height })} />
      </div>
    </fieldset>
  )
}

interface RangeFieldProps {
  label: string
  value: number
  min?: number
  onChange: (value: number) => void
}

function RangeField({ label, value, min = 0, onChange }: RangeFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span>
        {label} · {Math.round(value * 100)}%
      </span>
      <input
        type="range"
        min={min}
        max={1}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
