import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Variant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger' | 'inverse'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  /** Adds the ↗ arrow used on forward-moving calls to action. */
  arrow?: boolean
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-black disabled:opacity-40',
  brand: 'bg-brand text-ink hover:bg-brand-strong disabled:opacity-40',
  secondary: 'bg-surface text-fg ring-1 ring-inset ring-line-strong hover:bg-surface-2 disabled:opacity-50',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50',
  danger: 'bg-surface text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:opacity-50',
  inverse: 'bg-white text-ink hover:bg-white/90 disabled:opacity-50',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-10 px-4.5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={cn('size-3.5', className)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 11L11 5M6 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  arrow,
  className,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
        'transition-colors duration-150 disabled:cursor-not-allowed select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
      {arrow && !loading ? <Arrow /> : null}
    </button>
  )
}
