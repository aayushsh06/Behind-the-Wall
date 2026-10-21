interface WallSearchProps {
  value: string
  onChange: (value: string) => void
}

export function WallSearch({ value, onChange }: WallSearchProps) {
  return (
    <label className="block">
      <span className="sr-only">Search walls</span>
      <input
        type="search"
        inputMode="search"
        placeholder="Search by room or wall"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
      />
    </label>
  )
}
