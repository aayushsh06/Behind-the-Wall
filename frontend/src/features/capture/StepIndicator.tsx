import { CAPTURE_STEPS } from '@/features/capture/captureSteps'
import type { CaptureStep } from '@/features/capture/captureSteps'
import { cn } from '@/lib/cn'

interface StepIndicatorProps {
  current: CaptureStep
}

export function StepIndicator({ current }: StepIndicatorProps) {
  const currentIndex = CAPTURE_STEPS.findIndex((s) => s.key === current)
  return (
    <ol className="mb-5 flex items-center gap-2" aria-label="Progress">
      {CAPTURE_STEPS.map((step, index) => (
        <li key={step.key} className="flex flex-1 items-center gap-2">
          <span
            aria-current={step.key === current ? 'step' : undefined}
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
              index < currentIndex && 'bg-accent/20 text-accent',
              index === currentIndex && 'bg-fg text-bg',
              index > currentIndex && 'bg-surface-3 text-fg-faint',
            )}
          >
            {index + 1}
          </span>
          <span className={cn('text-xs font-medium', index <= currentIndex ? 'text-fg' : 'text-fg-faint')}>
            {step.label}
          </span>
          {index < CAPTURE_STEPS.length - 1 ? <span className={cn('h-px flex-1', index < currentIndex ? 'bg-accent/40' : 'bg-line')} /> : null}
        </li>
      ))}
    </ol>
  )
}
