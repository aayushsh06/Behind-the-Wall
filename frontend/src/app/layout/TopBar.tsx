import { Link, NavLink } from 'react-router-dom'

import { navItems } from '@/app/layout/navItems'
import { routes } from '@/app/routes'
import { Button, Logo } from '@/components/ui'
import { useSignedInUser } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function TopBar() {
  const user = useSignedInUser()
  const items = navItems(user.role).filter((item) => item.to !== routes.newWall())
  const isTrade = user.role === 'tradesperson'

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link to={routes.landing()} aria-label="Behind the Wall home">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1 rounded-full bg-surface p-1 ring-1 ring-inset ring-line">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                      isActive ? 'bg-ink text-white' : 'text-fg-muted hover:text-fg',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {isTrade ? (
            <Link to={routes.newWall()} className="hidden md:block">
              <Button arrow>Record a wall</Button>
            </Link>
          ) : null}
          <Link
            to={routes.settings()}
            aria-label={`Account: ${user.name}`}
            className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-ink ring-1 ring-inset ring-brand/40"
          >
            {initials(user.name) || '•'}
          </Link>
        </div>
      </div>
    </header>
  )
}
