import { Link, Outlet } from 'react-router-dom'

import { routes } from '@/app/routes'
import { PublicOnly } from '@/features/auth/RequireAuth'

export function BrandMark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-md bg-accent text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <path d="M3 10h18M3 16h18M9 4v6M15 10v6M9 16v4" />
        </svg>
      </span>
      <span className="text-base font-semibold text-fg">Behind the Wall</span>
    </span>
  )
}

const YEAR = new Date().getFullYear()

/** Layout for screens shown before signing in: plain header, no app navigation. */
export function AuthLayout() {
  return (
    <PublicOnly>
      <div className="flex min-h-full flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
            <Link to={routes.welcome()} aria-label="Behind the Wall home">
              <BrandMark />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 md:py-14">
          <Outlet />
        </main>
        <footer className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-fg-faint sm:px-6">© {YEAR} Behind the Wall</p>
        </footer>
      </div>
    </PublicOnly>
  )
}

/** Centered, card-framed column used by the sign-in and create-account forms. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md sm:rounded-lg sm:border sm:border-line sm:bg-surface sm:p-8 sm:shadow-card">
      {children}
    </div>
  )
}
