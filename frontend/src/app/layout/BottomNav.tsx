import { NavLink } from 'react-router-dom'

import { navItems } from '@/app/layout/navItems'
import { useSignedInUser } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

/** Tab bar for phones; hidden on larger screens where the top bar carries navigation. */
export function BottomNav() {
  const user = useSignedInUser()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto flex max-w-lg">
        {navItems(user.role).map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-fg-faint hover:text-fg-muted',
                )
              }
            >
              {item.icon}
              {item.label === 'Record a wall' ? 'Record' : item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
