import { FACE_OFFSET, FACES, type Face } from '../cube/facelet'

/**
 * Fixed 2D layout for the graph/mandala view, matching frame_00401.png:
 *
 * KEY INSIGHT: Each group center is AT an intersection of circles from the OTHER two groups.
 * - Three group centers form a triangle around the middle (leaving a central gap).
 * - Each group gets 9 stickers:
 *   - 1 at the group center (intersection point from other two groups)
 *   - 8 at intersections of THIS group's circles with adjacent groups' circles
 * - Total: 3 groups × 9 stickers = 27... but we need 54 (2 per intersection).
 * - INSIGHT CORRECTED: The two "sides" of each intersection (groupIdx 0 and 1) give us
 *   the two faces per group pair. So 3 pairs × 2 faces × 9 = 54 exactly.
 */

export type NodePos = { faceletIndex: number; x: number; y: number; face: Face }

const VIEW = 100
const CENTER = VIEW / 2

/**
 * The 3 group centers sit on a circle (CIRCLE_DISTANCE from center) at 120-deg
 * angles. This creates the TRIANGLE of centers seen in the reference.
 * Each group center is itself an intersection point of circles from the other groups.
 */
const CIRCLE_DISTANCE = 20
const GROUP_ANGLES = [-90, 30, 150] // degrees: top, lower-right, lower-left

/** Three concentric radii per group. */
const GROUP_RADII = [16, 22, 28]

/**
 * Face assignment per group pair.
 */
const GROUP_FACES: Array<[Face, Face]> = [
  ['U', 'D'],
  ['R', 'L'],
  ['F', 'B'],
]

/**
 * Compute the two intersection points of two circles.
 */
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

/**
 * Rotate a point (x, y) by deg degrees around the origin.
 */
function rot(x: number, y: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [x * c - y * s, x * s + y * c]
}

/**
 * Get the center position of a group (group 0, 1, or 2).
 */
function groupCenter(group: number): [number, number] {
  const angle = GROUP_ANGLES[group]
  const [dx, dy] = rot(0, -CIRCLE_DISTANCE, angle + 90)
  return [CENTER + dx, CENTER + dy]
}

/**
 * Build fixed positions for all 54 nodes.
 *
 * Strategy:
 *  - For EACH pair of adjacent groups (0-1, 1-2, 2-0):
 *    - Generate 9 intersection points per pair (3 radii × 3 radii = 9 combos)
 *    - Each intersection point can have 0, 1, or 2 actual crossing points
 *    - Collect BOTH sides (groupIdx 0 and 1) when 2 points exist
 *  - Deduplicate to avoid overlaps
 *  - Assign: 3 pairs × 2 faces/pair × 9 stickers/face = 54 total
 */
export function buildNodeLayout(): NodePos[] {
  interface IntersectionPt {
    x: number
    y: number
    pairIdx: number
    side: number // 0 or 1 (the two intersection points)
    radiusIdx: number
  }

  const allIntersections: IntersectionPt[] = []

  const adjacentPairs: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 0],
  ]

  // Compute all intersections between adjacent group pairs
  adjacentPairs.forEach((pair, pairIdx) => {
    const [g1, g2] = pair
    const [c1x, c1y] = groupCenter(g1)
    const [c2x, c2y] = groupCenter(g2)

    let radiusIdx = 0
    for (let r1Idx = 0; r1Idx < 3; r1Idx++) {
      for (let r2Idx = 0; r2Idx < 3; r2Idx++) {
        const r1 = GROUP_RADII[r1Idx]
        const r2 = GROUP_RADII[r2Idx]
        const pts = circleIntersections(c1x, c1y, r1, c2x, c2y, r2)

        // Capture both intersection points
        for (let side = 0; side < pts.length; side++) {
          const pt = pts[side]
          allIntersections.push({
            x: pt[0],
            y: pt[1],
            pairIdx,
            side,
            radiusIdx,
          })
        }

        radiusIdx++
      }
    }
  })

  // Deduplicate: remove duplicates within 2.5 units
  const deduped: IntersectionPt[] = []
  for (const pt of allIntersections) {
    const isDupe = deduped.some(
      (d) => Math.hypot(d.x - pt.x, d.y - pt.y) < 2.5,
    )
    if (!isDupe) deduped.push(pt)
  }

  // Sort for deterministic ordering
  deduped.sort(
    (a, b) =>
      a.pairIdx - b.pairIdx ||
      a.side - b.side ||
      a.radiusIdx - b.radiusIdx,
  )

  // Assign to faces
  const nodes: NodePos[] = []

  adjacentPairs.forEach((pair, pairIdx) => {
    const [g1] = pair
    const [faceA, faceB] = GROUP_FACES[g1]

    // Get all intersection points for this pair
    const pairIntersections = deduped.filter((pt) => pt.pairIdx === pairIdx)

    // First 9 intersections → faceA, local 0..8
    for (let local = 0; local < 9 && local < pairIntersections.length; local++) {
      const pt = pairIntersections[local]
      nodes.push({
        faceletIndex: FACE_OFFSET[faceA] + local,
        face: faceA,
        x: pt.x,
        y: pt.y,
      })
    }

    // Next 9 intersections → faceB, local 0..8
    for (let local = 0; local < 9 && local + 9 < pairIntersections.length; local++) {
      const pt = pairIntersections[local + 9]
      nodes.push({
        faceletIndex: FACE_OFFSET[faceB] + local,
        face: faceB,
        x: pt.x,
        y: pt.y,
      })
    }
  })

  // Ensure all 54 facelets are placed; fill gaps with center.
  for (const face of FACES) {
    for (let local = 0; local < 9; local++) {
      const faceletIdx = FACE_OFFSET[face] + local
      if (!nodes.some((n) => n.faceletIndex === faceletIdx)) {
        nodes.push({
          faceletIndex: faceletIdx,
          face,
          x: CENTER,
          y: CENTER,
        })
      }
    }
  }

  return nodes
}

/**
 * The overlapping guide circles: 9 circles total (3 groups × 3 radii each).
 */
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

export const LAYOUT_VIEWBOX = { size: VIEW }
export const NODE_RADIUS = 1.8
