import type { ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, Logo } from '@/components/ui'
import { PublicOnly } from '@/features/auth/PublicOnly'
import { useCurrentUser } from '@/hooks/useAuth'
import { HeroWallShot } from '@/features/marketing/HeroWallShot'

const SECTIONS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#homeowners', label: 'Homeowners' },
  { href: '#tradespeople', label: 'Tradespeople' },
]

/** Layout for screens shown before signing in: site header and footer, no app navigation. */
export function AuthLayout() {
  return (
    <PublicOnly>
      <AuthChrome>
        <Outlet />
      </AuthChrome>
    </PublicOnly>
  )
}

export function AuthChrome({ children }: { children: ReactNode }) {
  const { pathname, state } = useLocation()
  const onLanding = pathname === routes.home() || pathname === routes.landing()
  const user = useCurrentUser().data

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Link to={routes.landing()} aria-label="Behind the Wall home">
            <Logo />
          </Link>
          {onLanding ? (
            <nav aria-label="Sections" className="hidden md:block">
              <ul className="flex items-center gap-1 rounded-full bg-surface p-1 ring-1 ring-inset ring-line">
                {SECTIONS.map((section) => (
                  <li key={section.href}>
                    <a
                      href={section.href}
                      className="block rounded-full px-4 py-1.5 text-sm font-semibold text-fg-muted transition-colors hover:text-fg"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          {user ? (
            <Link to={routes.home()}>
              <Button arrow>{user.role === 'tradesperson' ? 'Your clients' : 'Your walls'}</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {pathname !== routes.login() ? (
                <Link to={routes.login()} state={state} className="hidden sm:block">
                  <Button variant="ghost">Sign in</Button>
                </Link>
              ) : null}
              {pathname !== routes.register() ? (
                <Link to={routes.register()} state={state}>
                  <Button arrow>Get started</Button>
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-ink text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-sm">
            <Logo inverse />
            <p className="mt-4 text-sm leading-relaxed">
              Wall-by-wall records of the pipes, wiring, and framing in a home, made while the wall is open.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <ul className="eyebrow flex gap-6 text-white">
              <li>
                <Link to={routes.login()} className="hover:text-brand">Sign in</Link>
              </li>
              <li>
                <Link to={routes.register()} className="hover:text-brand">Create account</Link>
              </li>
            </ul>
            <p className="eyebrow text-white/50">Human-Centered Software Design &amp; Development Project | Fall 2026</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** Sign-in and create-account: the form beside the product shot on large screens. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="mx-auto w-full max-w-md sm:rounded-3xl sm:bg-surface sm:p-9 sm:shadow-card sm:ring-1 sm:ring-inset sm:ring-line">
        {children}
      </div>
      <aside className="hidden lg:block">
        <HeroWallShot compact />
        <p className="eyebrow mt-5 text-fg-faint">Kitchen — Wall behind sink · 5 items · 1 area not inspected</p>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-fg-muted">
          Every record shows exactly what was found, where it is, and what nobody checked.
        </p>
      </aside>
    </div>
  )
}
