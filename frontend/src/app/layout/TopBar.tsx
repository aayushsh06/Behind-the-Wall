import { Link, NavLink } from 'react-router-dom'

import { navItems } from '@/app/layout/navItems'
import { routes } from '@/app/routes'
import { BrandMark } from '@/features/auth/AuthLayout'
import { useSignedInUser } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

export function TopBar() {
  const user = useSignedInUser()
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link to={routes.home()} aria-label="Behind the Wall home">
          <BrandMark />
        </Link>
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems(user.role).map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
