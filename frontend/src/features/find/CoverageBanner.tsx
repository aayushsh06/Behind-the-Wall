import { Banner } from '@/components/ui'
import { COVERAGE_META } from '@/domain/coverage'
import type { Coverage } from '@/domain/types'

interface CoverageBannerProps {
  coverage: Coverage
  note?: string
}

/** States plainly what the record does and does not cover (R2). */
export function CoverageBanner({ coverage, note }: CoverageBannerProps) {
  const meta = COVERAGE_META[coverage]
  return (
    <Banner tone={meta.tone} title={meta.description}>
      {note ? <p>{note}</p> : null}
    </Banner>
  )
}
