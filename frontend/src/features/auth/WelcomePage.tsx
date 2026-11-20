import { Link, useLocation } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button } from '@/components/ui'

const FEATURES = [
  {
    title: 'Organized by room',
    body: 'Tradespeople send each wall to the homeowner’s account, filed under its room, so records don’t get lost in old emails or paperwork.',
  },
  {
    title: 'Clear about what wasn’t inspected',
    body: 'Parts of a wall that were never opened are marked, so an empty area is never mistaken for a clear one.',
  },
  {
    title: 'A PDF for every wall',
    body: 'Homeowners open each wall as a PDF. When a tradesperson corrects a wall, the PDF updates.',
  },
] as const

export function WelcomePage() {
  // Keep the page the visitor was headed to, so signing in returns them there.
  const { state } = useLocation()

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <section>
        <h1 className="text-3xl font-semibold leading-tight text-fg sm:text-4xl">
          A record of what’s behind your walls.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
          Tradespeople record the pipes, wiring, and framing they find while a wall is open. Homeowners keep every
          record, wall by wall, ready for whoever does the next repair.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to={routes.register()} state={state} className="sm:w-44">
            <Button size="lg" fullWidth>
              Create an account
            </Button>
          </Link>
          <Link to={routes.login()} state={state} className="sm:w-44">
            <Button size="lg" variant="secondary" fullWidth>
              Sign in
            </Button>
          </Link>
        </div>

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-fg-muted">
          For tradespeople: record a wall while it’s open and send it to the homeowner using their email address. If they
          haven’t joined yet, invite them.
        </p>
      </section>

      <section aria-label="Features" className="rounded-lg border border-line bg-surface">
        <ul className="divide-y divide-line">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="p-5 sm:p-6">
              <h2 className="font-semibold text-fg">{feature.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
