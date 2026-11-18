import { Outlet } from 'react-router-dom'

import { BottomNav } from '@/app/layout/BottomNav'
import { HomeProvider } from '@/features/homes/HomeProvider'
import { useHome } from '@/features/homes/homeContext'
import { HomeSelector } from '@/features/homes/HomeSelector'

/** Single-column mobile layout with room reserved for the bottom navigation. */
export function AppShell() {
  return <HomeProvider><HomeShell /></HomeProvider>
}

function HomeShell() {
  const { home } = useHome()
  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-lg px-4 pt-5 pb-28">
        <HomeSelector />
        <Outlet key={home?.id ?? 'no-home'} />
      </main>
      <BottomNav />
    </div>
  )
}
