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
}

export interface SnapResult {
  points: Pt[]
  /** False when no convincing feature was found and the smoothed stroke is returned. */
  snapped: boolean
}

const MIN_STROKE_PX = 8
// Pull towards the drawn stroke: loose while finding the feature, firm while following it.
const STAY_FIND = 0.6
const STAY_FOLLOW = 2.5
const MAX_POINTS = 120

export function snapStroke(image: PixelImage, stroke: Pt[], options: SnapOptions = {}): SnapResult {
  const { width, height, data } = image
  const resampled = resample(stroke, 1.5)
  const drawnLength = polylineLength(resampled)
  if (resampled.length < 2 || drawnLength < MIN_STROKE_PX) {
    return { points: smoothStroke(stroke), snapped: false }
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
  if (!first) return { points: smoothStroke(stroke), snapped: false }
  const pathMean = first.reduce((sum, i) => sum + feature[i]!, 0) / first.length
  const convincing =
    pathMean > 0.35 && pathMean > corridorMean * 1.25 && polylineLength(toPixels(first)) < drawnLength * 2.5
  if (!convincing) return { points: smoothStroke(stroke), snapped: false }

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

  return { points: limitPoints(simplify(movingAverage(toPixels(best), 3), 1)), snapped: true }
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
  const steps = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ] as const
  while (heap.size) {
    const i = heap.pop()
    if (done[i]) continue
    done[i] = 1
    if (i === end) break
    const x = i % bw
    const y = (i - x) / bw
    for (const [dx, dy, length] of steps) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue
      const j = ny * bw + nx
      if (done[j] || dist[j]! > R) continue
      const miss = 1 - feature[j]!
      const away = dist[j]! / R
      const next = cost[i]! + length * (miss * miss + stay * away * away + 0.05)
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
