import { Outlet } from 'react-router-dom'

import { BottomNav } from '@/app/layout/BottomNav'
import { TopBar } from '@/app/layout/TopBar'

/**
 * Signed-in layout. Desktop gets a top bar with navigation; phones get a compact top bar
 * and a bottom tab bar, with room reserved below the content for it.
 */
export function AppShell() {
  return (
    <div className="min-h-full">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-28 sm:px-6 md:pt-12 md:pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
