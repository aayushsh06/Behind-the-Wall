import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

import { cn } from '@/lib/cn'

const FIELD_CLASSES =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-base text-fg ' +
  'placeholder:text-fg-faint transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20'

interface BaseProps {
  label: string
  hint?: string
  error?: string
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { multiline?: false }
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true }

export function TextField(props: InputProps | TextareaProps) {
  const id = useId()
  const { label, hint, error } = props

  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-fg-muted">{label}</span>
      {props.multiline ? (
        <textarea
          id={id}
          rows={3}
          {...stripOwnProps(props)}
          className={cn(FIELD_CLASSES, error && 'border-red-400/60', props.className)}
        />
      ) : (
        <input
          id={id}
          {...stripOwnProps(props)}
          className={cn(FIELD_CLASSES, error && 'border-red-400/60', props.className)}
        />
      )}
      {error ? (
        <span className="mt-1.5 block text-xs text-red-300">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-fg-faint">{hint}</span>
      ) : null}
    </label>
  )
}

function stripOwnProps<T extends BaseProps & { multiline?: boolean; className?: string }>(
  props: T,
): Omit<T, 'label' | 'hint' | 'error' | 'multiline' | 'className'> {
  const { label: _l, hint: _h, error: _e, multiline: _m, className: _c, ...rest } = props
  return rest
}
