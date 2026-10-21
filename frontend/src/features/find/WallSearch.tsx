interface WallSearchProps {
  value: string
  onChange: (value: string) => void
}

export function WallSearch({ value, onChange }: WallSearchProps) {
  return (
    <label className="relative block">
      <span className="sr-only">Search walls</span>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-faint"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        inputMode="search"
        placeholder="Search by room or wall"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-3.5 text-base text-fg placeholder:text-fg-faint transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </label>
  )
}
