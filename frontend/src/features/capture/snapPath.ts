/**
 * Snap a hand-drawn stroke onto the wire or pipe it was traced over.
 *
 * A wire or pipe in a photo is a thin band whose colour differs from what is around it.
 * The feature map scores every pixel by how far its colour is from the local average
 * (|pixel − box-blurred pixel|, strongest channel), which peaks along thin bands and
 * along the edges of wider ones. Only a corridor around the stroke is considered, so
 * nothing far from what the tradesperson drew can be picked up.
 *
 * Inside the corridor, a shortest-path search (Dijkstra, 8-connected) runs from the
 * stroke's start to its end. Stepping onto a pixel is cheap when its feature score is
 * high and expensive when it is far from the drawn stroke, so the result follows the
 * real feature while staying close to the drawing. If the best route doesn't look much
 * more like a feature than its surroundings, the stroke is kept as drawn (smoothed).
 *
 * A wire or pipe is one colour along its length. So a second pass takes the median
 * colour along the first route and searches again, now also rewarding pixels of that
 * colour. That keeps the run on one cable in a bundle and centres it on the cable
 * rather than its edge. The second route is used only if it really stays on that colour.
 *
 * This runs twice: once on the local-contrast map, and once adding a multi-scale ridge
 * ("vesselness") filter from the Hessian, which responds to the centre line of tube
 * shapes and prefers ones running the same way as the stroke. The ridge result centres
 * better, but where a stroke falls between two cables it can prefer the more prominent
 * one, so it is used only when it stays about as close to the stroke as the other.
 * Finally each point is nudged across the band to its weighted centre.
 *
 * All coordinates here are pixels of the analysed image. Pure functions, no DOM.
 */

export interface PixelImage {
  width: number
  height: number
  /** RGBA bytes, row by row (as in ImageData). */
  data: ArrayLike<number>
}

export interface Pt {
  x: number
  y: number
}

export interface SnapOptions {
  /** How far (px) the snapped path may move from the stroke. */
  corridor?: number
  /** Box-blur radius (px) for the local average the feature map compares against. */
  blurRadius?: number
  /** Weight (0..1) of the ridge (vesselness) filter in the feature map. */
  ridge?: number
  /** Nudge the final route onto the centre line of the band it follows. */
  refine?: boolean
}

export interface SnapResult {
  points: Pt[]
  /** False when no convincing feature was found and the smoothed stroke is returned. */
  snapped: boolean
}

interface Candidate extends SnapResult {
  /** Average distance (px) from the route to the drawn stroke. */
  offset: number
}

const MIN_STROKE_PX = 8
// Pull towards the drawn stroke: loose while finding the feature, firm while following it.
const STAY_FIND = 0.6
const STAY_FOLLOW = 2.5
const MAX_POINTS = 120
// Defaults chosen by benchmarking on real wall photos: refining the centre line helped on
// every feature tested; the ridge filter is used through the two-candidate choice below.
const RIDGE_WEIGHT = 0
const REFINE = true
// How much further from the stroke (px) the ridge route may be and still be preferred.
const OFFSET_MARGIN_PX = 3
// Above this many pixels in the working box, skip the (slower) ridge candidate.
const MAX_RIDGE_AREA = 160_000
const RIDGE_SCALES = [1.5, 3, 5]

export function snapStroke(image: PixelImage, stroke: Pt[], options: SnapOptions = {}): SnapResult {
  if (options.ridge !== undefined) return toResult(snapOnce(image, stroke, options))
  // Two candidates: local contrast, and the ridge filter. The ridge filter centres far
  // better on cables and pipes, but where the stroke falls between two cables it can
  // prefer the more prominent neighbour. The tradesperson traced the one they meant, so
  // the ridge route is used only when it stays as close to the stroke as the other.
  const plain = snapOnce(image, stroke, { ...options, ridge: 0 })
  // Very long strokes cover most of the photo; the ridge filter would take seconds on a
  // phone there, and long runs are usually straight, where the contrast route does well.
  if (!plain.snapped || boxArea(image, stroke, options) > MAX_RIDGE_AREA) return toResult(plain)
  const tubes = snapOnce(image, stroke, { ...options, ridge: 1 })
  // The ridge filter's scores are relative, so on a photo with nothing to snap to it can
  // still "find" a line in the noise. It may only improve a stroke the contrast method
  // already found a real feature for, never rescue one it rejected.
  if (!plain.snapped || !tubes.snapped) return toResult(plain)
  return toResult(tubes.offset <= plain.offset + OFFSET_MARGIN_PX ? tubes : plain)
}

/** Pixels in the stroke's working box (bounding box grown by the corridor). */
function boxArea(image: PixelImage, stroke: Pt[], options: SnapOptions): number {
  const R = options.corridor ?? Math.max(10, Math.round(0.03 * Math.max(image.width, image.height)))
  const xs = stroke.map((p) => p.x)
  const ys = stroke.map((p) => p.y)
  return (Math.max(...xs) - Math.min(...xs) + 2 * R) * (Math.max(...ys) - Math.min(...ys) + 2 * R)
}

function toResult({ points, snapped }: Candidate): SnapResult {
  return { points, snapped }
}

function snapOnce(image: PixelImage, stroke: Pt[], options: SnapOptions): Candidate {
  const { width, height, data } = image
  const resampled = resample(stroke, 1.5)
  const drawnLength = polylineLength(resampled)
  if (resampled.length < 2 || drawnLength < MIN_STROKE_PX) {
    return { points: smoothStroke(stroke), snapped: false, offset: Number.POSITIVE_INFINITY }
  }

  const R = options.corridor ?? Math.max(10, Math.round(0.03 * Math.max(width, height)))
  const r = options.blurRadius ?? Math.max(3, Math.round(R / 3))

  // Work only inside the stroke's bounding box, grown by the corridor.
  const minX = clampInt(Math.floor(Math.min(...resampled.map((p) => p.x))) - R, 0, width - 1)
  const maxX = clampInt(Math.ceil(Math.max(...resampled.map((p) => p.x))) + R, 0, width - 1)
  const minY = clampInt(Math.floor(Math.min(...resampled.map((p) => p.y))) - R, 0, height - 1)
  const maxY = clampInt(Math.ceil(Math.max(...resampled.map((p) => p.y))) + R, 0, height - 1)
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1

  const dist = strokeDistance(resampled, minX, minY, bw, bh)
  const feature = featureMap(data, width, height, minX, minY, bw, bh, r, dist, R)
  const ridgeWeight = options.ridge ?? RIDGE_WEIGHT
  if (ridgeWeight > 0) {
    // Tube-shaped structures (wires, pipes), favouring ones running the way the stroke does.
    const tangent = strokeTangents(resampled, minX, minY, bw, bh, dist)
    const ridge = ridgeMap(data, width, height, minX, minY, bw, bh, dist, R, tangent)
    normaliseInCorridor(feature, dist, R)
    for (let i = 0; i < feature.length; i++) {
      feature[i] = (1 - ridgeWeight) * feature[i]! + ridgeWeight * ridge[i]!
    }
  }

  // Normalise by the strongest feature in the corridor (with a floor, so a flat area's
  // noise isn't stretched into fake features).
  let fMax = 0
  let fSum = 0
  let fCount = 0
  for (let i = 0; i < feature.length; i++) {
    if (dist[i]! <= R) {
      fMax = Math.max(fMax, feature[i]!)
      fSum += feature[i]!
      fCount++
    }
  }
  const scale = Math.max(fMax, 0.12)
  for (let i = 0; i < feature.length; i++) feature[i] = Math.min(1, feature[i]! / scale)
  const corridorMean = fCount ? fSum / fCount / scale : 0

  // `stay` is how strongly a route is pulled back towards the drawn stroke.
  const route = (score: Float32Array, stay: number) => {
    const start = snapEndpoint(resampled[0]!, R, minX, minY, bw, bh, dist, score, stay)
    const end = snapEndpoint(resampled[resampled.length - 1]!, R, minX, minY, bw, bh, dist, score, stay)
    return start === end ? null : shortestPath(start, end, bw, bh, dist, score, R, stay)
  }
  const toPixels = (path: number[]) =>
    path.map((i) => ({ x: (i % bw) + minX + 0.5, y: Math.floor(i / bw) + minY + 0.5 }))

  // Pass 1: follow whatever stands out from its surroundings, loosely tied to the stroke.
  const first = route(feature, STAY_FIND)
  if (!first) return { points: smoothStroke(stroke), snapped: false, offset: Number.POSITIVE_INFINITY }
  const pathMean = first.reduce((sum, i) => sum + feature[i]!, 0) / first.length
  const convincing =
    pathMean > 0.35 && pathMean > corridorMean * 1.25 && polylineLength(toPixels(first)) < drawnLength * 2.5
  if (!convincing) return { points: smoothStroke(stroke), snapped: false, offset: Number.POSITIVE_INFINITY }

  // Pass 2: stay on the colour the first route found, held closer to the stroke so it
  // keeps to the nearest cable of that colour rather than a parallel one.
  let best = first
  const target = medianColour(data, width, first, bw, minX, minY)
  const similarity = colourSimilarity(data, width, minX, minY, bw, bh, dist, R, target)
  const combined = new Float32Array(feature.length)
  for (let i = 0; i < combined.length; i++) combined[i] = 0.45 * feature[i]! + 0.55 * similarity[i]!
  const second = route(combined, STAY_FOLLOW)
  if (second) {
    const onColour = second.reduce((sum, i) => sum + similarity[i]!, 0) / second.length
    if (onColour > 0.5 && polylineLength(toPixels(second)) < drawnLength * 2.5) best = second
  }

  let pixels = toPixels(best)
  if (options.refine ?? REFINE) {
    const score = best === first ? feature : combined
    pixels = refineCentreline(resample(pixels, 2), score, dist, R, minX, minY, bw, bh)
  }
  const points = limitPoints(simplify(movingAverage(pixels, 3), 1))
  const along = resample(points, 2)
  let offset = 0
  for (const q of along) {
    const ix = clampInt(Math.round(q.x) - minX, 0, bw - 1)
    const iy = clampInt(Math.round(q.y) - minY, 0, bh - 1)
    offset += dist[iy * bw + ix]!
  }
  offset /= Math.max(1, along.length)
  return { points, snapped: true, offset }
}

/** The drawn stroke, de-jittered: simplified, then rounded off with one Chaikin pass. */
export function smoothStroke(stroke: Pt[]): Pt[] {
  if (stroke.length < 3) return stroke.slice()
  return limitPoints(chaikin(simplify(movingAverage(stroke, 2), 1.5)))
}

// ---- geometry helpers ----------------------------------------------------------------

export function polylineLength(points: Pt[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y)
  }
  return total
}

/** Points spaced evenly every `step` px along the polyline. */
export function resample(points: Pt[], step: number): Pt[] {
  if (points.length < 2) return points.slice()
  const out: Pt[] = [points[0]!]
  let carry = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const segment = Math.hypot(b.x - a.x, b.y - a.y)
    let t = step - carry
    while (t <= segment) {
      out.push({ x: a.x + ((b.x - a.x) * t) / segment, y: a.y + ((b.y - a.y) * t) / segment })
      t += step
    }
    carry = segment - (t - step)
  }
  const last = points[points.length - 1]!
  const tail = out[out.length - 1]!
  if (tail.x !== last.x || tail.y !== last.y) out.push(last)
  return out
}

/** Ramer–Douglas–Peucker simplification. */
export function simplify(points: Pt[], epsilon: number): Pt[] {
  if (points.length < 3) return points.slice()
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: Array<[number, number]> = [[0, points.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()!
    let maxDistance = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(points[i]!, points[first]!, points[last]!)
      if (d > maxDistance) {
        maxDistance = d
        index = i
      }
    }
    if (index !== -1 && maxDistance > epsilon) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

function segmentDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function movingAverage(points: Pt[], half: number): Pt[] {
  if (points.length < 3) return points.slice()
  return points.map((point, i) => {
    if (i === 0 || i === points.length - 1) return point
    const lo = Math.max(0, i - half)
    const hi = Math.min(points.length - 1, i + half)
    let x = 0
    let y = 0
    for (let j = lo; j <= hi; j++) {
      x += points[j]!.x
      y += points[j]!.y
    }
    const n = hi - lo + 1
    return { x: x / n, y: y / n }
  })
}

function chaikin(points: Pt[]): Pt[] {
  if (points.length < 3) return points.slice()
  const out: Pt[] = [points[0]!]
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    out.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y })
    out.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y })
  }
  out.push(points[points.length - 1]!)
  return out
}

function limitPoints(points: Pt[]): Pt[] {
  let out = points
  let epsilon = 1
  while (out.length > MAX_POINTS) {
    epsilon *= 1.5
    out = simplify(points, epsilon)
  }
  return out
}

function clampInt(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

// ---- image analysis ------------------------------------------------------------------

/** Distance (px) from every pixel in the box to the stroke: a two-pass chamfer transform. */
function strokeDistance(stroke: Pt[], minX: number, minY: number, bw: number, bh: number): Float32Array {
  const dist = new Float32Array(bw * bh).fill(Number.POSITIVE_INFINITY)
  for (const p of stroke) {
    const x = Math.round(p.x) - minX
    const y = Math.round(p.y) - minY
    if (x >= 0 && y >= 0 && x < bw && y < bh) dist[y * bw + x] = 0
  }
  const D = Math.SQRT2
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x
      let d = dist[i]!
      if (x > 0) d = Math.min(d, dist[i - 1]! + 1)
      if (y > 0) {
        d = Math.min(d, dist[i - bw]! + 1)
        if (x > 0) d = Math.min(d, dist[i - bw - 1]! + D)
        if (x < bw - 1) d = Math.min(d, dist[i - bw + 1]! + D)
      }
      dist[i] = d
    }
  }
  for (let y = bh - 1; y >= 0; y--) {
    for (let x = bw - 1; x >= 0; x--) {
      const i = y * bw + x
      let d = dist[i]!
      if (x < bw - 1) d = Math.min(d, dist[i + 1]! + 1)
      if (y < bh - 1) {
        d = Math.min(d, dist[i + bw]! + 1)
        if (x < bw - 1) d = Math.min(d, dist[i + bw + 1]! + D)
        if (x > 0) d = Math.min(d, dist[i + bw - 1]! + D)
      }
      dist[i] = d
    }
  }
  return dist
}

/**
 * For corridor pixels: how much the colour differs from the local box-blur average,
 * strongest channel, 0..1. Uses integral images over the box (grown by the blur radius).
 */
function featureMap(
  data: ArrayLike<number>,
  width: number,
  height: number,
  minX: number,
  minY: number,
  bw: number,
  bh: number,
  r: number,
  dist: Float32Array,
  R: number,
): Float32Array {
  const ox = Math.max(0, minX - r)
  const oy = Math.max(0, minY - r)
  const ex = Math.min(width - 1, minX + bw - 1 + r)
  const ey = Math.min(height - 1, minY + bh - 1 + r)
  const iw = ex - ox + 2
  const ih = ey - oy + 2
  const sums = [new Float64Array(iw * ih), new Float64Array(iw * ih), new Float64Array(iw * ih)]
  for (let y = 1; y < ih; y++) {
    const row = [0, 0, 0]
    for (let x = 1; x < iw; x++) {
      const p = ((oy + y - 1) * width + (ox + x - 1)) * 4
      for (let c = 0; c < 3; c++) {
        row[c]! += data[p + c]!
        sums[c]![y * iw + x] = sums[c]![(y - 1) * iw + x]! + row[c]!
      }
    }
  }
  const feature = new Float32Array(bw * bh)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x
      if (dist[i]! > R) continue
      const gx = minX + x
      const gy = minY + y
      const x0 = Math.max(ox, gx - r) - ox
      const x1 = Math.min(ex, gx + r) - ox + 1
      const y0 = Math.max(oy, gy - r) - oy
      const y1 = Math.min(ey, gy + r) - oy + 1
      const area = (x1 - x0) * (y1 - y0)
      const p = (gy * width + gx) * 4
      let best = 0
      for (let c = 0; c < 3; c++) {
        const s = sums[c]!
        const mean = (s[y1 * iw + x1]! - s[y0 * iw + x1]! - s[y1 * iw + x0]! + s[y0 * iw + x0]!) / area
        best = Math.max(best, Math.abs(data[p + c]! - mean))
      }
      feature[i] = best / 255
    }
  }
  return feature
}

/** The strongest nearby feature pixel for a stroke end, favouring ones close to it. */
function snapEndpoint(
  point: Pt,
  R: number,
  minX: number,
  minY: number,
  bw: number,
  bh: number,
  dist: Float32Array,
  feature: Float32Array,
  stay: number,
): number {
  const px = Math.round(point.x) - minX
  const py = Math.round(point.y) - minY
  const radius = Math.round(R / 2)
  let best = clampInt(py, 0, bh - 1) * bw + clampInt(px, 0, bw - 1)
  let bestScore = Number.POSITIVE_INFINITY
  for (let y = Math.max(0, py - radius); y <= Math.min(bh - 1, py + radius); y++) {
    for (let x = Math.max(0, px - radius); x <= Math.min(bw - 1, px + radius); x++) {
      const i = y * bw + x
      const d = Math.hypot(x - px, y - py)
      if (d > radius || dist[i]! > R) continue
      const score = (1 - feature[i]!) + stay * (d / radius)
      if (score < bestScore) {
        bestScore = score
        best = i
      }
    }
  }
  return best
}

/** Median RGB along a route: the colour of the wire or pipe it found. */
function medianColour(
  data: ArrayLike<number>,
  width: number,
  path: number[],
  bw: number,
  minX: number,
  minY: number,
): [number, number, number] {
  const channels: [number[], number[], number[]] = [[], [], []]
  for (const i of path) {
    const p = ((Math.floor(i / bw) + minY) * width + (i % bw) + minX) * 4
    for (let c = 0; c < 3; c++) channels[c]!.push(data[p + c]!)
  }
  const median = (values: number[]) => values.sort((a, b) => a - b)[values.length >> 1] ?? 0
  return [median(channels[0]), median(channels[1]), median(channels[2])]
}

/** How close each corridor pixel's colour is to `target`, 0..1 (Gaussian on RGB distance). */
function colourSimilarity(
  data: ArrayLike<number>,
  width: number,
  minX: number,
  minY: number,
  bw: number,
  bh: number,
  dist: Float32Array,
  R: number,
  target: [number, number, number],
): Float32Array {
  const SIGMA = 42
  const out = new Float32Array(bw * bh)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x
      if (dist[i]! > R) continue
      const p = ((y + minY) * width + x + minX) * 4
      const dr = data[p]! - target[0]
      const dg = data[p + 1]! - target[1]
      const db = data[p + 2]! - target[2]
      out[i] = Math.exp(-(dr * dr + dg * dg + db * db) / (SIGMA * SIGMA))
    }
  }
  return out
}

function normaliseInCorridor(values: Float32Array, dist: Float32Array, R: number): void {
  let max = 0
  for (let i = 0; i < values.length; i++) if (dist[i]! <= R) max = Math.max(max, values[i]!)
  if (max <= 0) return
  for (let i = 0; i < values.length; i++) values[i] = Math.min(1, values[i]! / max)
}

/**
 * Direction of the stroke (radians) at the nearest stroke point, for every pixel in the
 * box: copied outward from the stroke along with the chamfer distance.
 */
function strokeTangents(
  stroke: Pt[],
  minX: number,
  minY: number,
  bw: number,
  bh: number,
  dist: Float32Array,
): Float32Array {
  const angle = new Float32Array(bw * bh)
  const owner = new Float32Array(bw * bh).fill(Number.POSITIVE_INFINITY)
  for (let k = 0; k < stroke.length; k++) {
    const a = stroke[Math.max(0, k - 2)]!
    const b = stroke[Math.min(stroke.length - 1, k + 2)]!
    const x = Math.round(stroke[k]!.x) - minX
    const y = Math.round(stroke[k]!.y) - minY
    if (x < 0 || y < 0 || x >= bw || y >= bh) continue
    angle[y * bw + x] = Math.atan2(b.y - a.y, b.x - a.x)
    owner[y * bw + x] = 0
  }
  // Two sweeps: each pixel takes the angle of whichever already-visited neighbour is
  // closest to the stroke.
  const take = (i: number, j: number, best: number) => {
    if (dist[j]! < best) {
      angle[i] = angle[j]!
      return dist[j]!
    }
    return best
  }
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x
      if (owner[i] === 0) continue
      let best = owner[i]!
      if (x > 0) best = take(i, i - 1, best)
      if (y > 0) {
        best = take(i, i - bw, best)
        if (x > 0) best = take(i, i - bw - 1, best)
        if (x < bw - 1) best = take(i, i - bw + 1, best)
      }
      owner[i] = best
    }
  }
  for (let y = bh - 1; y >= 0; y--) {
    for (let x = bw - 1; x >= 0; x--) {
      const i = y * bw + x
      if (owner[i] === 0) continue
      let best = owner[i]!
      if (x < bw - 1) best = take(i, i + 1, best)
      if (y < bh - 1) {
        best = take(i, i + bw, best)
        if (x < bw - 1) best = take(i, i + bw + 1, best)
        if (x > 0) best = take(i, i + bw - 1, best)
      }
      owner[i] = best
    }
  }
  return angle
}

/**
 * Gaussian blur of one channel over a region (row-major, w × h), approximated by three
 * box blurs with running sums: the cost doesn't grow with sigma, which matters on phones.
 */
function gaussianBlur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  // Box widths whose three-pass convolution matches the Gaussian's variance.
  const ideal = Math.sqrt((12 * sigma * sigma) / 3 + 1)
  let lower = Math.floor(ideal)
  if (lower % 2 === 0) lower--
  const upper = lower + 2
  const m = Math.round((12 * sigma * sigma - 3 * lower * lower - 12 * lower - 9) / (-4 * lower - 4))
  let a = Float32Array.from(src)
  let b = new Float32Array(w * h)
  for (let pass = 0; pass < 3; pass++) {
    const radius = ((pass < m ? lower : upper) - 1) / 2
    boxBlurRows(a, b, w, h, radius)
    boxBlurColumns(b, a, w, h, radius)
  }
  b = a
  return b
}

function boxBlurRows(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
  const scale = 1 / (2 * r + 1)
  // Clamped source offsets, computed once instead of per pixel.
  const add = new Int32Array(w)
  const sub = new Int32Array(w)
  for (let x = 0; x < w; x++) {
    add[x] = Math.min(w - 1, x + r + 1)
    sub[x] = Math.max(0, x - r)
  }
  for (let y = 0; y < h; y++) {
    const row = y * w
    let acc = 0
    for (let k = -r; k <= r; k++) acc += src[row + (k < 0 ? 0 : k >= w ? w - 1 : k)]!
    for (let x = 0; x < w; x++) {
      dst[row + x] = acc * scale
      acc += src[row + add[x]!]! - src[row + sub[x]!]!
    }
  }
}

function boxBlurColumns(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
  const scale = 1 / (2 * r + 1)
  const add = new Int32Array(h)
  const sub = new Int32Array(h)
  for (let y = 0; y < h; y++) {
    add[y] = Math.min(h - 1, y + r + 1) * w
    sub[y] = Math.max(0, y - r) * w
  }
  const acc = new Float64Array(w)
  for (let k = -r; k <= r; k++) {
    const row = (k < 0 ? 0 : k >= h ? h - 1 : k) * w
    for (let x = 0; x < w; x++) acc[x]! += src[row + x]!
  }
  // Row by row (cache-friendly), carrying one running sum per column.
  for (let y = 0; y < h; y++) {
    const row = y * w
    const plus = add[y]!
    const minus = sub[y]!
    for (let x = 0; x < w; x++) {
      dst[row + x] = acc[x]! * scale
      acc[x]! += src[plus + x]! - src[minus + x]!
    }
  }
}

/**
 * Multi-scale ridge ("vesselness") filter, per colour channel, both polarities.
 *
 * At each pixel the Hessian (second derivatives of the blurred image) has a large
 * eigenvalue across a tube and a small one along it. Line-likeness is high when the
 * small/large ratio is low and the curvature strong (Frangi et al.). Scale-normalised
 * by σ², so thin wires and wide pipes compete fairly. The response is weighted by how
 * well the tube's direction agrees with the stroke's.
 */
function ridgeMap(
  data: ArrayLike<number>,
  width: number,
  height: number,
  minX: number,
  minY: number,
  bw: number,
  bh: number,
  dist: Float32Array,
  R: number,
  tangent: Float32Array,
): Float32Array {
  const margin = Math.ceil(3 * Math.max(...RIDGE_SCALES)) + 2
  const ox = Math.max(0, minX - margin)
  const oy = Math.max(0, minY - margin)
  const ex = Math.min(width - 1, minX + bw - 1 + margin)
  const ey = Math.min(height - 1, minY + bh - 1 + margin)
  const rw = ex - ox + 1
  const rh = ey - oy + 1
  const best = new Float32Array(bw * bh)
  for (let c = 0; c < 3; c++) {
    const channel = new Float32Array(rw * rh)
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) channel[y * rw + x] = data[((oy + y) * width + ox + x) * 4 + c]! / 255
    }
    for (const sigma of RIDGE_SCALES) {
      const g = gaussianBlur(channel, rw, rh, sigma)
      const norm = sigma * sigma
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const i = y * bw + x
          if (dist[i]! > R) continue
          const gx = minX + x - ox
          const gy = minY + y - oy
          if (gx < 1 || gy < 1 || gx >= rw - 1 || gy >= rh - 1) continue
          const o = gy * rw + gx
          const centre = g[o]!
          const hxx = (g[o + 1]! - 2 * centre + g[o - 1]!) * norm
          const hyy = (g[o + rw]! - 2 * centre + g[o - rw]!) * norm
          const hxy = ((g[o + rw + 1]! - g[o - rw + 1]! - g[o + rw - 1]! + g[o - rw - 1]!) / 4) * norm
          const root = Math.sqrt((hxx - hyy) * (hxx - hyy) + 4 * hxy * hxy)
          const l1 = (hxx + hyy + root) / 2
          const l2 = (hxx + hyy - root) / 2
          const [small, large] = Math.abs(l1) < Math.abs(l2) ? [l1, l2] : [l2, l1]
          if (Math.abs(large) < 1e-6) continue
          const blobness = small / large
          const strength = Math.abs(large)
          const lineLike = Math.exp(-(blobness * blobness) / 0.5) * strength
          // The eigenvector of the large eigenvalue points across the tube.
          const across = Math.atan2(large - hxx, hxy)
          const along = across + Math.PI / 2
          const agree = Math.cos(along - tangent[i]!) ** 2
          const response = lineLike * (0.3 + 0.7 * agree)
          if (response > best[i]!) best[i] = response
        }
      }
    }
  }
  normaliseInCorridor(best, dist, R)
  return best
}

/**
 * Move each point of a route to the score-weighted centre of the band beneath it,
 * measured along the route's normal. Corrects routes that hug one edge of a cable.
 */
function refineCentreline(
  points: Pt[],
  score: Float32Array,
  dist: Float32Array,
  R: number,
  minX: number,
  minY: number,
  bw: number,
  bh: number,
): Pt[] {
  const reach = Math.max(2, Math.round(R / 3))
  const sample = (x: number, y: number) => {
    const ix = Math.round(x) - minX
    const iy = Math.round(y) - minY
    if (ix < 0 || iy < 0 || ix >= bw || iy >= bh) return 0
    const i = iy * bw + ix
    return dist[i]! <= R ? score[i]! : 0
  }
  return points.map((p, k) => {
    const a = points[Math.max(0, k - 2)]!
    const b = points[Math.min(points.length - 1, k + 2)]!
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    if (length === 0) return p
    const nx = -(b.y - a.y) / length
    const ny = (b.x - a.x) / length
    const here = sample(p.x, p.y)
    let weight = 0
    let offset = 0
    for (let t = -reach; t <= reach; t += 0.5) {
      const v = sample(p.x + nx * t, p.y + ny * t)
      // Only the part of the band at least as strong as half the peak here counts.
      const w = v >= here * 0.5 ? v * v : 0
      weight += w
      offset += w * t
    }
    if (weight === 0) return p
    const shift = Math.max(-reach, Math.min(reach, offset / weight))
    return { x: p.x + nx * shift, y: p.y + ny * shift }
  })
}

/** Cheapest corridor route from start to end (pixel indices in the box), or null. */
function shortestPath(
  start: number,
  end: number,
  bw: number,
  bh: number,
  dist: Float32Array,
  feature: Float32Array,
  R: number,
  stay: number,
): number[] | null {
  const n = bw * bh
  const cost = new Float64Array(n).fill(Number.POSITIVE_INFINITY)
  const previous = new Int32Array(n).fill(-1)
  const done = new Uint8Array(n)
  const heap = new MinHeap()
  cost[start] = 0
  heap.push(start, 0)
  const DX = [1, -1, 0, 0, 1, 1, -1, -1]
  const DY = [0, 0, 1, -1, 1, -1, 1, -1]
  const LENGTH = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2]
  while (heap.size) {
    const i = heap.pop()
    if (done[i]) continue
    done[i] = 1
    if (i === end) break
    const x = i % bw
    const y = (i - x) / bw
    const base = cost[i]!
    for (let k = 0; k < 8; k++) {
      const nx = x + DX[k]!
      const ny = y + DY[k]!
      if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue
      const j = ny * bw + nx
      if (done[j] || dist[j]! > R) continue
      const miss = 1 - feature[j]!
      const away = dist[j]! / R
      const next = base + LENGTH[k]! * (miss * miss + stay * away * away + 0.05)
      if (next < cost[j]!) {
        cost[j] = next
        previous[j] = i
        heap.push(j, next)
      }
    }
  }
  if (!done[end]) return null
  const path: number[] = []
  for (let i = end; i !== -1; i = previous[i]!) path.push(i)
  return path.reverse()
}

/** Binary min-heap of (index, priority). */
class MinHeap {
  private items: number[] = []
  private priorities: number[] = []

  get size(): number {
    return this.items.length
  }

  push(item: number, priority: number): void {
    const items = this.items
    const priorities = this.priorities
    let i = items.length
    items.push(item)
    priorities.push(priority)
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (priorities[parent]! <= priority) break
      items[i] = items[parent]!
      priorities[i] = priorities[parent]!
      i = parent
    }
    items[i] = item
    priorities[i] = priority
  }

  pop(): number {
    const items = this.items
    const priorities = this.priorities
    const top = items[0]!
    const lastItem = items.pop()!
    const lastPriority = priorities.pop()!
    if (items.length) {
      let i = 0
      const length = items.length
      for (;;) {
        const left = 2 * i + 1
        const right = left + 1
        let smallest = i
        let smallestPriority = lastPriority
        if (left < length && priorities[left]! < smallestPriority) {
          smallest = left
          smallestPriority = priorities[left]!
        }
        if (right < length && priorities[right]! < smallestPriority) smallest = right
        if (smallest === i) break
        items[i] = items[smallest]!
        priorities[i] = priorities[smallest]!
        i = smallest
      }
      items[i] = lastItem
      priorities[i] = lastPriority
    }
    return top
  }
}
