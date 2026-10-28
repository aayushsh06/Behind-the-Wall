import { Outlet } from 'react-router-dom'

import { PublicOnly } from '@/features/auth/RequireAuth'

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl border border-line-strong bg-surface-2 text-accent">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M3 16h18M9 4v6M15 10v6M9 16v4" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Behind the Wall</span>
    </div>
  )
}

/** Single column without bottom navigation, for screens shown before signing in. */
export function AuthLayout() {
  return (
    <PublicOnly>
      <div className="min-h-full">
        <main className="mx-auto flex w-full max-w-md flex-col px-4 pt-8 pb-12">
          <Outlet />
        </main>
      </div>
    </PublicOnly>
  )
}
