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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden"
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
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors',
                  isActive ? 'text-fg' : 'text-fg-faint hover:text-fg-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span aria-hidden="true" className="absolute top-0 h-0.5 w-10 rounded-full bg-brand" /> : null}
                  {item.icon}
                  {item.label === 'Record a wall' ? 'Record' : item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
