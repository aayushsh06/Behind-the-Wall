import { Button, ErrorMessage, PageHeader, SectionHeading } from '@/components/ui'
import { useApiHealth, useRecordStats } from '@/features/settings/useSettingsData'
import { useSeedSampleHome } from '@/hooks/useSeedSampleHome'

export function SettingsPage() {
  const stats = useRecordStats()
  const health = useApiHealth()
  const seed = useSeedSampleHome()

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <SectionHeading>Records</SectionHeading>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-fg-muted">Walls saved</dt>
            <dd className="text-right font-semibold">{stats.isPending ? '…' : stats.total}</dd>
            <dt className="text-fg-muted">With photo</dt>
            <dd className="text-right font-semibold">{stats.isPending ? '…' : stats.withPhoto}</dd>
            <dt className="text-fg-muted">API</dt>
            <dd className="flex items-center justify-end gap-1.5 text-right font-semibold">
              <span
                className={`size-2 rounded-full ${health.isPending ? 'bg-fg-faint' : health.isSuccess ? 'bg-emerald-400' : 'bg-red-400'}`}
              />
              {health.isPending ? '…' : health.isSuccess ? 'Connected' : 'Unreachable'}
            </dd>
          </dl>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <SectionHeading>Sample data</SectionHeading>
          <p className="mb-3 text-sm leading-relaxed text-fg-muted">
            Loads six labeled walls for usability sessions. Running it again resets those six walls without touching
            others.
          </p>
          <Button variant="secondary" fullWidth loading={seed.isPending} onClick={() => seed.mutate()}>
            Load sample home
          </Button>
          {seed.isSuccess ? <p className="mt-2 text-center text-sm text-emerald-300">Sample home loaded.</p> : null}
          {seed.isError ? <div className="mt-2"><ErrorMessage error={seed.error} /></div> : null}
        </section>

        <p className="text-center text-xs text-fg-faint">Behind the Wall prototype · records stay on this server only.</p>
      </div>
    </>
  )
}
