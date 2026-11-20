import QRCode from 'qrcode'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, PageHeader } from '@/components/ui'
import { isCaptureDevice } from '@/lib/device'

/**
 * Recording and marking up walls needs a phone's camera. On a desktop this shows a QR
 * code that opens the same page on the tradesperson's phone instead of the form.
 */
export function PhoneOnly({ children, title }: { children: ReactNode; title: string }) {
  const [capture] = useState(isCaptureDevice)
  if (capture) return children
  return <PhoneOnlyNotice title={title} />
}

function PhoneOnlyNotice({ title }: { title: string }) {
  const location = useLocation()
  const url = `${window.location.origin}${location.pathname}${location.search}`
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(url, { margin: 1, width: 440, color: { dark: '#121418', light: '#ffffff' } }).then(
      (data) => !cancelled && setQr(data),
    )
    return () => {
      cancelled = true
    }
  }, [url])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Phone required" title={title} backTo={routes.home()} />
      <section className="grid overflow-hidden rounded-3xl bg-surface ring-1 ring-inset ring-line md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center gap-5 p-8 md:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Continue on your phone</h2>
          <p className="text-[15px] leading-relaxed text-fg-muted">
            Walls are photographed and marked up on site, while they’re open, so this step uses your phone’s camera.
            Scan the code with your phone to pick up right here.
          </p>
          <ol className="flex flex-col gap-3 text-sm">
            {['Open the camera on your phone', 'Point it at the code and tap the link', 'Sign in if asked'].map(
              (step, index) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="eyebrow flex size-7 items-center justify-center rounded-full bg-surface-2 text-fg">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {step}
                </li>
              ),
            )}
          </ol>
          <div>
            <Button variant="secondary" onClick={() => void copy()}>
              {copied ? 'Link copied' : 'Copy link instead'}
            </Button>
          </div>
        </div>
        <div className="relative flex items-center justify-center bg-ink bg-blueprint p-10">
          <span aria-hidden="true" className="hatch-ink absolute inset-0" />
          <div className="relative rounded-2xl bg-white p-4 shadow-lift">
            {qr ? (
              <img src={qr} alt={`QR code for ${url}`} className="size-52" />
            ) : (
              <div className="size-52 animate-pulse rounded-lg bg-surface-2" />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
