import { FACE_OFFSET, FACES, type Face } from '../cube/facelet'

/**
 * Fixed 2D layout for the graph/mandala view, matching frame_00401.png:
 *
 * KEY CONSTRAINT: Each of the 54 stickers sits at exactly ONE intersection point.
 * No two faces share an intersection; each intersection belongs to one face.
 *
 * Geometry:
 *  - 3 groups of 3 concentric circles (9 circles total)
 *  - MIDDLE circle radius must pass through opposite group centers
 *  - CIRCLE_DISTANCE = MIDDLE_RADIUS / sqrt(3) ≈ 12.7
 *  - 3 adjacent pairs: (0,1), (1,2), (2,0)
 *  - Each pair has 2 intersection sides (inner vs outer)
 *  - Each side has 9 intersection points (3 radii from each group)
 *  - Total: 3 pairs × 2 sides × 9 = 54 intersections
 */

export type NodePos = { faceletIndex: number; x: number; y: number; face: Face }

const VIEW = 100
const CENTER = VIEW / 2
// Vertical center is nudged DOWN so the top (U) cluster doesn't clip the panel's
// top edge. Only affects y; x stays centered.
const CENTER_Y = VIEW / 2 + 6

// Overall scale of the 2D mandala within the fixed 100×100 viewBox. Increasing
// this enlarges circles/stickers on screen (they fill more of the panel). Only
// radial distances scale — GROUP_ANGLES are unchanged, so every sticker keeps
// its angular position and the ring rotation logic is unaffected.
const SCALE = 1.35

const MIDDLE_RADIUS = 22 * SCALE
const CIRCLE_DISTANCE = MIDDLE_RADIUS / Math.sqrt(3)
const GROUP_ANGLES = [-90, 30, 150] // degrees (unchanged — preserves angles)
const GROUP_RADII = [18 * SCALE, MIDDLE_RADIUS, 26 * SCALE]

const GROUP_FACES: Array<[Face, Face]> = [
  ['F', 'B'],
  ['U', 'D'],
  ['R', 'L'],
]

function circleIntersections(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
): Array<[number, number]> {
  const d = Math.hypot(x2 - x1, y2 - y1)
  if (d === 0 || d > r1 + r2 || d < Math.abs(r1 - r2)) return []

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h2 = r1 * r1 - a * a
  if (h2 < 0) return []

  const h = Math.sqrt(h2)
  const px = x1 + (a * (x2 - x1)) / d
  const py = y1 + (a * (y2 - y1)) / d
  const offX = (h * (y2 - y1)) / d
  const offY = (h * (x2 - x1)) / d

  return [
    [px - offX, py + offY],
    [px + offX, py - offY],
  ]
}

function rot(x: number, y: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [x * c - y * s, x * s + y * c]
}

function groupCenter(group: number): [number, number] {
  const angle = GROUP_ANGLES[group]
  const [dx, dy] = rot(0, -CIRCLE_DISTANCE, angle + 90)
  return [CENTER + dx, CENTER_Y + dy]
}

/**
 * Build 54 node positions from circle intersections.
 * Strategy:
 *  - For each adjacent pair, compute all 18 intersections (9 per side)
 *  - Assign side 0 to the first face, side 1 to the second face
 *  - Deduplicate globally to ensure 54 unique points
 *  - Each intersection belongs to exactly ONE face
 */
export function buildNodeLayout(): NodePos[] {
  interface IntersectionPt {
    x: number
    y: number
    face: Face
    local: number // 0..8 within the face
  }

  const intersections: IntersectionPt[] = []

  const adjacentPairs: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 0],
  ]

  // For each adjacent pair, compute intersections and assign to faces
  adjacentPairs.forEach((pair) => {
    const [g1, g2] = pair
    const [faceA, faceB] = GROUP_FACES[g1]
    const [c1x, c1y] = groupCenter(g1)
    const [c2x, c2y] = groupCenter(g2)

    let radiusIdx = 0
    for (let r1Idx = 0; r1Idx < 3; r1Idx++) {
      for (let r2Idx = 0; r2Idx < 3; r2Idx++) {
        const r1 = GROUP_RADII[r1Idx]
        const r2 = GROUP_RADII[r2Idx]
        const pts = circleIntersections(c1x, c1y, r1, c2x, c2y, r2)

        // Side 0 → faceA, local radiusIdx
        if (pts.length >= 1) {
          intersections.push({
            x: pts[0][0],
            y: pts[0][1],
            face: faceA,
            local: radiusIdx,
          })
        }

        // Side 1 → faceB, local radiusIdx
        if (pts.length >= 2) {
          intersections.push({
            x: pts[1][0],
            y: pts[1][1],
            face: faceB,
            local: radiusIdx,
          })
        }

        radiusIdx++
      }
    }
  })

  // Deduplicate: if two points are very close, keep only the first
  const deduped: IntersectionPt[] = []
  for (const pt of intersections) {
    const isDupe = deduped.some(
      (d) => Math.hypot(d.x - pt.x, d.y - pt.y) < 1.2 * SCALE,
    )
    if (!isDupe) deduped.push(pt)
  }

  // Build nodes: use deduplicated points
  const nodes: NodePos[] = []
  for (const pt of deduped) {
    nodes.push({
      faceletIndex: FACE_OFFSET[pt.face] + pt.local,
      face: pt.face,
      x: pt.x,
      y: pt.y,
    })
  }

  // Fallback: fill any missing facelets with center
  for (const face of FACES) {
    for (let local = 0; local < 9; local++) {
      const faceletIdx = FACE_OFFSET[face] + local
      if (!nodes.some((n) => n.faceletIndex === faceletIdx)) {
        nodes.push({
          faceletIndex: faceletIdx,
          face,
          x: CENTER,
          y: CENTER_Y,
        })
      }
    }
  }

  return nodes
}

export type GuideCircle = { cx: number; cy: number; r: number }

export function guideCircles(): GuideCircle[] {
  const circles: GuideCircle[] = []
  for (let g = 0; g < 3; g++) {
    const [cx, cy] = groupCenter(g)
    for (const r of GROUP_RADII) {
      circles.push({ cx, cy, r })
    }
  }
  return circles
}

/** The 3 inner groups (each has its own rotation circle) and their opposites. */
export const INNER_GROUPS: Face[] = ['U', 'R', 'F']
export const OPPOSITE_FACE: Record<Face, Face> = {
  U: 'D',
  D: 'U',
  F: 'B',
  B: 'F',
  R: 'L',
  L: 'R',
}

/** Centroid (cluster center) of a face's 9 nodes — the pivot of its circle. */
export function faceCenter(face: Face, nodes: NodePos[]): [number, number] {
  const fn = nodes.filter((n) => n.face === face)
  const cx = fn.reduce((s, n) => s + n.x, 0) / fn.length
  const cy = fn.reduce((s, n) => s + n.y, 0) / fn.length
  return [cx, cy]
}

/**
 * A ring is 12 slots ordered strictly clockwise by screen angle (index 0..11).
 * Each slot has a fixed position and the facelet index that natively sits there
 * (the "home" occupant). A quarter-turn rotates occupants by 3 slots.
 */
export type RingSlot = { faceletIndex: number; x: number; y: number; face: Face }
export type Ring = {
  center: [number, number]
  radius: number
  /** 12 slots, clockwise from angle 0. */
  slots: RingSlot[]
}

/** Distance bands (from a face-cluster center) for its 3 concentric circles.
 *  Scaled with SCALE so they still bracket the inner/middle/outer node radii. */
const RING_BANDS = {
  inner: [15 * SCALE, 20 * SCALE] as [number, number], // d ≈ 18*SCALE
  middle: [20 * SCALE, 24 * SCALE] as [number, number], // d ≈ 22*SCALE (static)
  outer: [24 * SCALE, 29 * SCALE] as [number, number], // d ≈ 26*SCALE
}

/**
 * Build one ring (inner or outer) around an inner group's cluster center as 12
 * slots in canonical clockwise order. No per-face arc grouping — a continuous
 * 0..11 sequence, so a quarter-turn is simply "shift occupants by 3 slots".
 */
function buildRing(
  face: Face,
  nodes: NodePos[],
  band: [number, number],
): Ring {
  const [cx, cy] = faceCenter(face, nodes)

  const onRing = nodes
    .map((n) => ({
      n,
      d: Math.hypot(n.x - cx, n.y - cy),
      ang: (Math.atan2(n.y - cy, n.x - cx) * 180) / Math.PI,
    }))
    .filter((x) => x.d >= band[0] && x.d < band[1])

  // Clockwise by screen angle (SVG y is down, so increasing atan2 = clockwise).
  for (const x of onRing) if (x.ang < 0) x.ang += 360
  onRing.sort((a, b) => a.ang - b.ang)

  const slots: RingSlot[] = onRing.map((x) => ({
    faceletIndex: x.n.faceletIndex,
    x: x.n.x,
    y: x.n.y,
    face: x.n.face,
  }))

  const radius = onRing.reduce((s, x) => s + x.d, 0) / Math.max(1, onRing.length)
  return { center: [cx, cy], radius, slots }
}

/**
 * For an inner group (U/R/F), build its inner and outer rings. The inner ring
 * is rotated by the group's own move (U); the outer ring is rotated by the
 * opposite face's move (D) — i.e. U's outer ring IS D's inner ring. The middle
 * ring is static and not returned.
 */
export type GroupRings = { inner: Ring; outer: Ring }

export function innerGroupRings(face: Face, nodes: NodePos[]): GroupRings {
  return {
    inner: buildRing(face, nodes, RING_BANDS.inner),
    outer: buildRing(face, nodes, RING_BANDS.outer),
  }
}

/** Slots to shift for one clockwise quarter-turn (12 slots / 4 quarters = 3). */
export const RING_QUARTER_STEP = 3

export const LAYOUT_VIEWBOX = { size: VIEW }
export const NODE_RADIUS = 2.4
