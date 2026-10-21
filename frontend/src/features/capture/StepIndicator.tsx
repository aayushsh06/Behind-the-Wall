import { CAPTURE_STEPS } from '@/features/capture/captureSteps'
import type { CaptureStep } from '@/features/capture/captureSteps'
import { cn } from '@/lib/cn'

interface StepIndicatorProps {
  current: CaptureStep
}

export function StepIndicator({ current }: StepIndicatorProps) {
  const currentIndex = CAPTURE_STEPS.findIndex((s) => s.key === current)
  return (
    <ol className="mb-4 flex items-center gap-2" aria-label="Progress">
      {CAPTURE_STEPS.map((step, index) => (
        <li key={step.key} className="flex flex-1 items-center gap-2">
          <span
            aria-current={step.key === current ? 'step' : undefined}
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-xs font-bold',
              index <= currentIndex ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500',
            )}
          >
            {index + 1}
          </span>
          <span className={cn('text-xs font-medium', index <= currentIndex ? 'text-stone-900' : 'text-stone-500')}>
            {step.label}
          </span>
          {index < CAPTURE_STEPS.length - 1 ? <span className="h-px flex-1 bg-stone-200" /> : null}
        </li>
      ))}
    </ol>
  )
}
