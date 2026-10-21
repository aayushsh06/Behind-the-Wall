import { Outlet } from 'react-router-dom'

import { BottomNav } from '@/app/layout/BottomNav'

/** Single-column mobile layout with room reserved for the bottom navigation. */
export function AppShell() {
  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
