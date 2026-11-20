import { CAPTURE_STEPS } from '@/features/capture/captureSteps'
import type { CaptureStep } from '@/features/capture/captureSteps'
import { cn } from '@/lib/cn'

interface StepIndicatorProps {
  current: CaptureStep
}

export function StepIndicator({ current }: StepIndicatorProps) {
  const currentIndex = CAPTURE_STEPS.findIndex((s) => s.key === current)
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
      {CAPTURE_STEPS.map((step, index) => (
        <li key={step.key} className="flex flex-1 items-center gap-2">
          <span
            aria-current={step.key === current ? 'step' : undefined}
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              index < currentIndex && 'bg-accent/10 text-accent',
              index === currentIndex && 'bg-accent text-white',
              index > currentIndex && 'bg-surface-3 text-fg-faint',
            )}
          >
            {index + 1}
          </span>
          <span className={cn('text-sm font-medium', index === currentIndex ? 'inline' : 'hidden sm:inline', index <= currentIndex ? 'text-fg' : 'text-fg-faint')}>
            {step.label}
          </span>
          {index < CAPTURE_STEPS.length - 1 ? <span className={cn('h-px flex-1', index < currentIndex ? 'bg-accent/50' : 'bg-line-strong')} /> : null}
        </li>
      ))}
    </ol>
  )
}
