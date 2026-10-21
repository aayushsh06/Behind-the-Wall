import { Button, ErrorMessage, PageHeader } from '@/components/ui'
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
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Records</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-stone-600">Walls saved</dt>
            <dd className="text-right font-semibold">{stats.isPending ? '…' : stats.total}</dd>
            <dt className="text-stone-600">With photo</dt>
            <dd className="text-right font-semibold">{stats.isPending ? '…' : stats.withPhoto}</dd>
            <dt className="text-stone-600">API</dt>
            <dd className="text-right font-semibold">
              {health.isPending ? '…' : health.isSuccess ? 'Connected' : 'Unreachable'}
            </dd>
          </dl>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Sample data</h2>
          <p className="mb-3 text-sm text-stone-600">
            Loads six labeled walls for usability sessions. Running it again resets those six walls without touching
            others.
          </p>
          <Button variant="secondary" fullWidth loading={seed.isPending} onClick={() => seed.mutate()}>
            Load sample home
          </Button>
          {seed.isSuccess ? <p className="mt-2 text-center text-sm text-green-700">Sample home loaded.</p> : null}
          {seed.isError ? <div className="mt-2"><ErrorMessage error={seed.error} /></div> : null}
        </section>

        <p className="text-center text-xs text-stone-500">Behind the Wall prototype · records stay on this server only.</p>
      </div>
    </>
  )
}
