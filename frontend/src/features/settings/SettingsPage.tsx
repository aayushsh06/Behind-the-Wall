import { Button, ErrorMessage, PageHeader, SectionHeading } from '@/components/ui'
import { HomeownerAccessSection, TradespersonAccessSection } from '@/features/settings/AccessSection'
import { useApiHealth, useRecordStats } from '@/features/settings/useSettingsData'
import { useLogout, useSignedInUser } from '@/hooks/useAuth'

const ROLE_LABEL = { homeowner: 'Homeowner', tradesperson: 'Tradesperson' } as const
const CARD = 'rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5'

export function SettingsPage() {
  const stats = useRecordStats()
  const health = useApiHealth()
  const user = useSignedInUser()
  const logout = useLogout()
  const isTrade = user.role === 'tradesperson'

  return (
    <>
      <PageHeader title="Account" />
      <div className="flex max-w-2xl flex-col gap-4">
        <section className={CARD}>
          <SectionHeading aside={ROLE_LABEL[user.role]}>Account</SectionHeading>
          <p className="font-semibold">{user.name}</p>
          <p className="mb-3 text-sm text-fg-muted">{user.email}</p>
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            loading={logout.isPending}
            onClick={() => logout.mutate()}
          >
            Sign out
          </Button>
          {logout.isError ? (
            <div className="mt-2">
              <ErrorMessage error={logout.error} />
            </div>
          ) : null}
        </section>

        {isTrade ? <TradespersonAccessSection /> : <HomeownerAccessSection />}

        <section className={CARD}>
          <SectionHeading>Records</SectionHeading>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-fg-muted">{isTrade ? 'Walls you can open' : 'Walls in your home'}</dt>
            <dd className="text-right font-semibold">{stats.isPending ? '…' : stats.total}</dd>
            <dt className="text-fg-muted">With photo</dt>
            <dd className="text-right font-semibold">{stats.isPending ? '…' : stats.withPhoto}</dd>
            <dt className="text-fg-muted">Server</dt>
            <dd className="flex items-center justify-end gap-1.5 text-right font-semibold">
              <span
                className={`size-2 rounded-full ${health.isPending ? 'bg-fg-faint' : health.isSuccess ? 'bg-green-600' : 'bg-red-600'}`}
              />
              {health.isPending ? '…' : health.isSuccess ? 'Connected' : 'Unreachable'}
            </dd>
          </dl>
        </section>

        <p className="text-sm text-fg-faint">Records are stored on this server.</p>
      </div>
    </>
  )
}
