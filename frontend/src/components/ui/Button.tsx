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
  primary: 'bg-fg text-bg hover:bg-white disabled:bg-fg/40 disabled:text-bg/70',
  secondary: 'bg-surface-2 text-fg border border-line-strong hover:bg-surface-3 disabled:opacity-50',
  ghost: 'bg-transparent text-fg-muted hover:bg-white/5 hover:text-fg disabled:opacity-50',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-50',
}

const SIZE_CLASSES: Record<Size, string> = {
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
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
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[-0.01em]',
        'transition-[background-color,transform,opacity] duration-150 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:active:scale-100 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
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
