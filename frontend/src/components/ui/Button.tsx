import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong disabled:opacity-50',
  secondary: 'bg-surface text-fg border border-line-strong hover:bg-surface-2 disabled:opacity-50',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50',
  danger: 'bg-surface text-red-700 border border-red-300 hover:bg-red-50 disabled:opacity-50',
}

const SIZE_CLASSES: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
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
        'inline-flex items-center justify-center gap-2 rounded-md font-medium',
        'transition-colors duration-150 disabled:cursor-not-allowed select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  )
}
