import { useId } from 'react'

import { cn } from '@/lib/cn'

/**
 * The mark: a solid wall with a square section cut away, revealing the amber hatch the
 * app uses for what lies behind it.
 */
export function LogoMark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  const clip = useId()
  const wall = inverse ? '#ffffff' : 'var(--color-ink)'
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)}>
      <defs>
        <clipPath id={clip}>
          <rect x="14.5" y="4" width="13.5" height="13.5" rx="3" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="9" fill={wall} />
      <rect x="14.5" y="4" width="13.5" height="13.5" rx="3" fill="var(--color-brand)" />
      <g clipPath={`url(#${clip})`} stroke="var(--color-ink)" strokeWidth="1.7">
        <path d="M11 15l9-9M14.5 18.5l10.5-10.5M19 21l10-10" />
      </g>
    </svg>
  )
}

/** Wordmark: one even, medium-semibold weight throughout. */
export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark inverse={inverse} />
      <span
        className={cn(
          'text-[17px] font-semibold leading-none tracking-[-0.025em]',
          inverse ? 'text-white' : 'text-fg',
        )}
      >
        Behind the Wall
      </span>
    </span>
  )
}
