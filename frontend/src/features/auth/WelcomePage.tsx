import { Link, useLocation } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button } from '@/components/ui'
import { BrandMark } from '@/features/auth/AuthLayout'

const FEATURES = [
  {
    title: 'Find a wall in seconds',
    body: 'Every wall is grouped by room and searchable, so you are not digging through email or a drawer.',
  },
  {
    title: 'See what nobody checked',
    body: 'Areas that were never opened are marked, so you know what is still a guess.',
  },
  {
    title: 'Send it to your contractor',
    body: 'Share one wall as a single file in a text or email before they arrive.',
  },
] as const

export function WelcomePage() {
  // Keep the page the visitor was headed to, so signing in returns them there.
  const { state } = useLocation()

  return (
    <>
      <BrandMark />

      <h1 className="mt-10 text-[28px] font-bold leading-[1.15] tracking-tight">
        Know what is behind your walls before you call someone.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
        A wall-by-wall record of the pipes, wires, and framing in your home, kept in one place and ready to hand to
        whoever does the next repair.
      </p>

      <ul className="mt-8 flex flex-col gap-3">
        {FEATURES.map((feature, index) => (
          <li key={feature.title} className="flex gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
              {index + 1}
            </span>
            <div>
              <p className="font-semibold">{feature.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{feature.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-2">
        <Link to={routes.register()} state={state}>
          <Button size="lg" fullWidth>
            Create account
          </Button>
        </Link>
        <Link to={routes.login()} state={state}>
          <Button size="lg" variant="secondary" fullWidth>
            Sign in
          </Button>
        </Link>
      </div>

      <p className="mt-6 text-center text-sm leading-relaxed text-fg-faint">
        Tradesperson? Record a wall while it is open and leave the homeowner a record they can find later.
      </p>
    </>
  )
}
