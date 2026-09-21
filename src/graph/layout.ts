import { FACE_OFFSET, FACES, type Face } from '../cube/facelet'

/**
 * Fixed 2D layout for the graph/mandala view, matching frame_00401.png:
 *
 * - THREE circle groups, each group = 3 concentric circles centered at a point.
 * - The 3 group centers form an EQUILATERAL TRIANGLE around the middle,
 *   leaving a LARGE CENTRAL GAP (key visual feature).
 * - Circles from DIFFERENT groups OVERLAP, creating INTERSECTION POINTS.
 * - Each of the 54 stickers sits AT an intersection point where two circles cross.
 * - Stickers form 6 faces (color clusters) with 9 stickers each, arranged
 *   with 3-fold rotational symmetry around the center.
 *
 * Coordinates are in an abstract square viewBox (0..VIEW). The SVG scales to fit.
 */

export type NodePos = { faceletIndex: number; x: number; y: number; face: Face }

const VIEW = 100
const CENTER = VIEW / 2

/**
 * The 3 group centers sit on a circle (CIRCLE_DISTANCE from center) at 120-deg
 * angles. This creates the TRIANGLE of centers seen in the reference, with a
 * visible central gap.
 *
 * Tuned so that adjacent circles overlap significantly:
 * - Distance between adjacent centers ≈ 2 * CIRCLE_DISTANCE * sin(60°)
 * - With CIRCLE_DISTANCE=20: inter-center distance ≈ 34.6
 * - With radii [16, 22, 28]: max overlap = 28+28=56 >> 34.6 ✓
 */
const CIRCLE_DISTANCE = 20 // reduced to bring centers closer
const GROUP_ANGLES = [-90, 30, 150] // degrees: top, lower-right, lower-left

/** Three concentric radii per group (expanded so circles overlap across groups). */
const GROUP_RADII = [16, 22, 28]

/**
 * Face assignment per group: which two opposite faces' stickers live in each group.
 * Group 0 (top): U, D
 * Group 1 (lower-right): R, L
 * Group 2 (lower-left): F, B
 */
const GROUP_FACES: Array<[Face, Face]> = [
  ['U', 'D'],
  ['R', 'L'],
  ['F', 'B'],
]

/**
 * Compute the two intersection points of two circles.
 * Returns empty array if circles don't intersect, or the two points [x,y] if they do.
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
  // No intersection if circles don't overlap or one is inside the other
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
 * Build fixed positions for all 54 nodes by computing circle-circle intersections.
 *
 * Strategy (matching frame_00401.png):
 *  - Compute intersections ONLY between adjacent group pairs: (0,1), (1,2), (2,0).
 *  - EACH pair generates 2 GROUPS of 9 intersection points (one on each side of the overlap).
 *  - Each circle pair (r1_from_g1, r2_from_g2) intersects at 2 points: one on each side.
 *  - Total: 3 pairs × 2 groups × 9 = 54 stickers exactly.
 *
 * The two intersection points from each circle pair are sorted and assigned:
 *  - radiusIdx 0..8 → first intersection (one side)
 *  - radiusIdx 0..8 → second intersection (other side, flipped)
 */
export function buildNodeLayout(): NodePos[] {
  interface IntersectionData {
    x: number
    y: number
    pairIdx: number // which pair (0, 1, or 2)
    groupIdx: number // which group within the pair (0 or 1, for the two sides)
    radiusIdx: number // which radius combination (0..8)
  }

  const intersections: IntersectionData[] = []

  // For ADJACENT groups only: (0,1), (1,2), (2,0)
  const adjacentPairs: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 0],
  ]

  adjacentPairs.forEach((pair, pairIdx) => {
    const [g1, g2] = pair
    const [c1x, c1y] = groupCenter(g1)
    const [c2x, c2y] = groupCenter(g2)

    // Compute all 9 intersections (3×3 radius combinations)
    let radiusIdx = 0
    for (let r1Idx = 0; r1Idx < 3; r1Idx++) {
      for (let r2Idx = 0; r2Idx < 3; r2Idx++) {
        const r1 = GROUP_RADII[r1Idx]
        const r2 = GROUP_RADII[r2Idx]
        const pts = circleIntersections(c1x, c1y, r1, c2x, c2y, r2)

        // Each circle pair can have 0, 1, or 2 intersection points.
        if (pts.length >= 1) {
          intersections.push({
            x: pts[0][0],
            y: pts[0][1],
            pairIdx,
            groupIdx: 0, // first intersection (one side)
            radiusIdx,
          })
        }
        if (pts.length >= 2) {
          intersections.push({
            x: pts[1][0],
            y: pts[1][1],
            pairIdx,
            groupIdx: 1, // second intersection (other side)
            radiusIdx,
          })
        }

        radiusIdx++
      }
    }
  })

  // Now assign 54 stickers to these intersection points.
  // We have exactly 54 intersections (ideally: 3 pairs × 2 sides × 9 radius combos).
  // Assign faces in order: first 18 from pair 0, next 18 from pair 1, last 18 from pair 2.

  const nodes: NodePos[] = []
  let nodeIdx = 0

  adjacentPairs.forEach((pair, pairIdx) => {
    const [g1, g2] = pair
    const [faceA, faceB] = GROUP_FACES[g1]
    const [faceC, faceD] = GROUP_FACES[g2]

    // Get intersections for this pair, sorted by groupIdx then radiusIdx
    const pairIntersections = intersections
      .filter((pt) => pt.pairIdx === pairIdx)
      .sort((a, b) => a.groupIdx - b.groupIdx || a.radiusIdx - b.radiusIdx)

    // Assign the first 9 to faceA
    for (let local = 0; local < 9 && local < pairIntersections.length; local++) {
      const pt = pairIntersections[local]
      nodes.push({
        faceletIndex: FACE_OFFSET[faceA] + local,
        face: faceA,
        x: pt.x,
        y: pt.y,
      })
    }

    // Assign the next 9 to faceB
    for (let local = 0; local < 9 && local + 9 < pairIntersections.length; local++) {
      const pt = pairIntersections[local + 9]
      nodes.push({
        faceletIndex: FACE_OFFSET[faceB] + local,
        face: faceB,
        x: pt.x,
        y: pt.y,
      })
    }

    nodeIdx += Math.min(18, pairIntersections.length)
  })

  // Ensure all 54 facelets are covered; fill any gaps with center positions.
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
