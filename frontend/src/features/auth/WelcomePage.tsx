import { Link, useLocation } from 'react-router-dom'

import { useCurrentUser } from '@/hooks/useAuth'

import { routes } from '@/app/routes'
import { Button, Dimension } from '@/components/ui'
import { HeroWallShot } from '@/features/marketing/HeroWallShot'
import { UTILITY_META } from '@/domain/utility'
import { LEGEND } from '@/features/marketing/legend'

const STEPS = [
  {
    title: 'Photograph the open wall',
    body: 'While the drywall is off, the tradesperson takes a photo on their phone and marks the wall’s corners and size.',
  },
  {
    title: 'Mark what’s inside',
    body: 'Tap to place pipes, wiring, and framing. Positions are measured from the floor and the wall’s edge automatically.',
  },
  {
    title: 'Send it to the homeowner',
    body: 'The record goes to the homeowner’s account by email and is filed under the room. They open it as a PDF any time.',
  },
] as const

const AUDIENCES = [
  {
    id: 'homeowners',
    eyebrow: 'For homeowners',
    title: 'Every wall in your home, on file.',
    points: [
      'Records from every tradesperson, sorted by room',
      'Each wall as a PDF you can open, download, or forward',
      'You decide who can correct a record',
      'Free to join; nothing to install',
    ],
    cta: 'Create a homeowner account',
  },
  {
    id: 'tradespeople',
    eyebrow: 'For tradespeople',
    title: 'Leave a record, not a mystery.',
    points: [
      'Record on your phone in a couple of minutes',
      'Send to the homeowner by email, or invite them to join',
      'All your clients and their walls in one list',
      'Fix a record later and their PDF updates',
    ],
    cta: 'Create a tradesperson account',
  },
] as const

export function WelcomePage() {
  // Keep the page the visitor was headed to, so signing in returns them there.
  const { state } = useLocation()
  // Signed-in visitors (who got here from the logo) are sent back into the app instead.
  const user = useCurrentUser().data
  const primary = user
    ? { to: routes.home(), label: user.role === 'tradesperson' ? 'Go to your clients' : 'Go to your walls' }
    : { to: routes.register(), label: 'Get started free' }

  return (
    <>
      {/* Hero */}
      <section className="px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-ink sm:rounded-[36px]">
          <img
            src="/images/wall-framing.jpg"
            alt=""
            className="absolute inset-0 size-full object-cover object-[70%_center]"
            fetchPriority="high"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/20 max-md:bg-gradient-to-t max-md:via-ink/80 max-md:to-ink/30"
          />
          <span aria-hidden="true" className="hatch-ink absolute inset-0 opacity-30" />

          <div className="relative flex min-h-[600px] flex-col justify-end p-7 sm:p-12 md:min-h-[660px] md:justify-center md:p-16">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur">
                <span className="size-1.5 rounded-full bg-brand" />
                Wall records for homes
              </p>
              <h1 className="mt-6 text-[42px] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[76px]">
                Know what’s behind the wall <span className="text-brand">before you cut.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
                Tradespeople record the pipes, wiring, and framing they find while a wall is open. Homeowners keep
                every record, room by room, for whoever does the next job.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to={primary.to} state={state}>
                  <Button size="lg" variant="brand" arrow fullWidth>
                    {primary.label}
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button size="lg" variant="ghost" fullWidth className="text-white ring-1 ring-inset ring-white/30 hover:bg-white/10 hover:text-white">
                    See how it works
                  </Button>
                </a>
              </div>
              <p className="mt-6 text-sm text-white/60">Free for homeowners · Record on any phone · Every wall as a PDF</p>
            </div>
          </div>

          {/* A real record, floating over the hero on large screens. */}
          <div className="absolute bottom-10 right-10 hidden w-[300px] overflow-hidden rounded-2xl bg-surface shadow-sheet lg:block">
            <img src="/images/wall-kitchen.jpg" alt="" className="aspect-[16/9] w-full object-cover" />
            <div className="p-4">
              <p className="text-[13px] font-semibold text-fg-faint">Kitchen · Wall behind sink</p>
              <p className="mt-1 text-[15px] font-semibold tracking-tight">5 items recorded</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
                  <span className="size-1.5 rounded-full bg-brand" />
                  Part not inspected
                </span>
                <span className="text-xs font-semibold text-fg-muted">PDF · Rev 2</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The product */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 md:pt-28 md:pb-32">
        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-end">
          <div>
            <p className="eyebrow text-brand-ink">See a record</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-[44px]">
              One photo. Everything inside, marked.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-fg-muted md:pb-2">
            Each item gets a number, a colour, and a position measured from the floor and the wall’s edge. Anything that
            wasn’t opened is hatched, so it’s never mistaken for clear.
          </p>
        </div>
        <HeroWallShot className="mt-12" />
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="grid gap-6 md:grid-cols-[1fr_1.4fr] md:items-end">
            <div>
              <p className="eyebrow text-brand-ink">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-[44px]">
                From open wall to permanent record.
              </h2>
            </div>
            <p className="text-base leading-relaxed text-fg-muted md:pb-2">
              Once drywall goes back up, what’s inside is a guess. Behind the Wall captures it at the one moment it’s
              visible, and keeps it with the house.
            </p>
          </div>
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <Dimension as="p" aside={`Step ${index + 1} of 3`}>
                  {String(index + 1).padStart(2, '0')}
                </Dimension>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Blank never means safe */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-surface ring-1 ring-inset ring-line">
            <div aria-hidden="true" className="bg-blueprint absolute inset-0" />
            <div className="absolute inset-[12%] rounded-xl border-2 border-dashed border-line-strong" />
            <div className="absolute bottom-[12%] left-[12%] right-[12%] top-[52%] flex items-center justify-center overflow-hidden rounded-b-xl border-2 border-brand bg-brand-soft">
              <span aria-hidden="true" className="hatch absolute inset-0" />
              <span className="eyebrow relative rounded bg-ink px-2 py-1 text-white">Not inspected</span>
            </div>
            <span className="absolute left-[30%] top-[22%] flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md" style={{ backgroundColor: UTILITY_META.pipe.hex }}>1</span>
            <span className="absolute left-[58%] top-[34%] flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md" style={{ backgroundColor: UTILITY_META.wire.hex }}>2</span>
          </div>
          <div>
            <p className="eyebrow text-brand-ink">Honest records</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-[44px]">
              Blank never means safe.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-fg-muted">
              If only part of a wall was opened, the rest is hatched and labelled “not inspected”, on screen and in the
              PDF. Nobody mistakes an empty area for a clear one.
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {LEGEND.map((item) => (
                <li key={item.label} className="flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-line">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="bg-surface-2">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          {AUDIENCES.map((audience) => (
            <article
              key={audience.id}
              id={audience.id}
              className="flex scroll-mt-24 flex-col rounded-[28px] bg-surface p-8 shadow-card ring-1 ring-inset ring-line sm:p-10"
            >
              <p className="eyebrow text-brand-ink">{audience.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{audience.title}</h2>
              <ul className="mt-8 flex flex-1 flex-col divide-y divide-line border-y border-line">
                {audience.points.map((point) => (
                  <li key={point} className="flex items-center gap-3 py-3.5 text-[15px]">
                    <span aria-hidden="true" className="h-px w-4 bg-brand" />
                    {point}
                  </li>
                ))}
              </ul>
              {user ? null : (
                <Link to={routes.register()} state={state} className="mt-8 self-start">
                  <Button variant="secondary" arrow>
                    {audience.cta}
                  </Button>
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <div className="relative overflow-hidden rounded-[32px] bg-ink">
          <img
            src="/images/wall-framing.jpg"
            alt=""
            className="absolute inset-y-0 right-0 hidden h-full w-3/5 object-cover opacity-70 md:block [mask-image:linear-gradient(to_right,transparent,black_45%)]"
          />
          <span aria-hidden="true" className="hatch-ink absolute inset-0" />
          <div className="relative max-w-lg p-8 sm:p-12 md:p-14">
            <p className="eyebrow text-brand">Opening a wall this week?</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] text-white sm:text-[44px]">
              Record it before the drywall goes back.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              It takes a couple of minutes on site, and the homeowner keeps it for good.
            </p>
            <Link to={user ? primary.to : routes.register()} state={state} className="mt-8 inline-block">
              <Button size="lg" variant="inverse" arrow>
                {user ? primary.label : 'Create a free account'}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
