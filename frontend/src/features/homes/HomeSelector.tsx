import { Link, useNavigate } from 'react-router-dom'

import { routes } from '@/app/routes'
import { useHome } from '@/features/homes/homeContext'

export function HomeSelector() {
  const { homes, home, selectHome } = useHome()
  const navigate = useNavigate()

  return (
    <div className="mb-5 flex items-end gap-3">
      <label className="min-w-0 flex-1 text-sm text-fg-muted">
        Home
        <select
          className="mt-1 block w-full rounded-xl border border-line bg-surface-2 p-2.5 text-fg"
          value={home?.id ?? ''}
          disabled={homes.length === 0}
          onChange={(event) => {
            selectHome(event.target.value)
            void navigate(routes.home())
          }}
        >
          {homes.length === 0 ? <option value="">No home access yet</option> : null}
          {homes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {home ? <span className="mt-1 block text-xs">{home.permission === 'owner' ? 'Homeowner access' : home.permission === 'editor' ? 'Can view and edit records' : 'View-only access'}</span> : null}
      </label>
      <Link className="pb-3 text-sm font-semibold text-accent" to={routes.homes()}>Manage homes</Link>
    </div>
  )
}
