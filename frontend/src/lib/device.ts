/**
 * Whether this device is a phone or tablet with a camera to photograph walls.
 *
 * True when the primary pointer is touch and the device reports itself as mobile
 * (iPadOS reports a Mac user agent, so a touch "Mac" counts too). Touchscreen laptops
 * have a fine primary pointer and are treated as desktops.
 */
export function isCaptureDevice(): boolean {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const ua = navigator.userAgent
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  return coarse && (mobileUa || iPadOs)
}
