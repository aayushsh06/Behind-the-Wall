import type { ReactNode } from 'react'

import { routes } from '@/app/routes'
import type { Role } from '@/domain/types'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  'aria-hidden': true,
} as const

const ITEMS: NavItem[] = [
  {
    to: routes.home(),
    label: 'Walls',
    end: true,
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <path d="M3 10h18M3 16h18M9 4v6M15 10v6M9 16v4" />
      </svg>
    ),
  },
  {
    to: routes.newWall(),
    label: 'Record a wall',
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: routes.settings(),
    label: 'Account',
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
]

/** Tradespeople see their list as clients and can record; homeowners only read walls. */
export function navItems(role: Role): NavItem[] {
  if (role === 'homeowner') return ITEMS.filter((item) => item.to !== routes.newWall())
  return ITEMS.map((item) => (item.to === routes.home() ? { ...item, label: 'Clients' } : item))
}
