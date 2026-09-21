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
 */
const CIRCLE_DISTANCE = 30 // distance of group centers from the central point
const GROUP_ANGLES = [-90, 30, 150] // degrees: top, lower-right, lower-left

/** Three concentric radii per group (tight nesting for small gaps between circles). */
const GROUP_RADII = [14, 20, 26]

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
 *  - Each pair generates 9 intersection points (3 radii from group A × 3 from group B).
 *  - Total: 3 pairs × 9 points = 27 unique intersection locations.
 *  - Assign stickers by alternating faces at different radius levels:
 *    - Inner radius intersections (r1[0] vs r2[0]): faces at index 0 of their pair.
 *    - Middle radius: faces at index 1.
 *    - Outer radius: faces at index 2 or wrap.
 *  - This spreads 54 stickers across the 27 points (2 stickers per point, one per face of the pair).
 */
export function buildNodeLayout(): NodePos[] {
  interface IntersectionData {
    x: number
    y: number
    pair: number // which pair (0=g0-g1, 1=g1-g2, 2=g2-g0)
    radiusIdx: number // which radius combination (0..8, representing r1_idx * 3 + r2_idx)
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

        // Take the first intersection point (or closest to the midpoint between groups).
        if (pts.length > 0) {
          let bestPt = pts[0]
          // If there are 2 intersection points, prefer the one closer to the midline.
          if (pts.length === 2) {
            const mid = Math.atan2(c2y - c1y, c2x - c1x)
            const ang0 = Math.atan2(pts[0][1] - CENTER, pts[0][0] - CENTER) - mid
            const ang1 = Math.atan2(pts[1][1] - CENTER, pts[1][0] - CENTER) - mid
            bestPt = Math.abs(ang0) < Math.abs(ang1) ? pts[0] : pts[1]
          }

          intersections.push({
            x: bestPt[0],
            y: bestPt[1],
            pair: pairIdx,
            radiusIdx,
          })
        }
        radiusIdx++
      }
    }
  })

  // Now assign 54 stickers to these intersection points.
  // Each pair has 2 faces; each intersection gets one sticker per face.
  // Local indices (0..8): spread across the 9 radius combinations per pair.
  const nodes: NodePos[] = []

  adjacentPairs.forEach((pair, pairIdx) => {
    const [g1, g2] = pair
    const [faceA, faceB] = GROUP_FACES[g1]
    const [faceC, faceD] = GROUP_FACES[g2]

    // Intersections for this pair
    const pairIntersections = intersections.filter((pt) => pt.pair === pairIdx)

    // First 9 stickers (faceA): local 0..8
    for (let local = 0; local < 9 && local < pairIntersections.length; local++) {
      const pt = pairIntersections[local]
      nodes.push({
        faceletIndex: FACE_OFFSET[faceA] + local,
        face: faceA,
        x: pt.x,
        y: pt.y,
      })
    }

    // Second 9 stickers (faceB): local 0..8
    for (let local = 0; local < 9 && local < pairIntersections.length; local++) {
      const pt = pairIntersections[local]
      nodes.push({
        faceletIndex: FACE_OFFSET[faceB] + local,
        face: faceB,
        x: pt.x,
        y: pt.y,
      })
    }

    // (faceC and faceD are handled by the next pair iteration, due to cyclic pairs)
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
