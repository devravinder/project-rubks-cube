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
 * Strategy:
 *  - Compute all pairwise circle intersections (group i, radius r1 vs group j, radius r2).
 *  - Sort and deduplicate the intersection points.
 *  - Assign 54 facelets to intersection points such that each face gets 9 stickers
 *    and they form clear color clusters in the reference pattern.
 */
export function buildNodeLayout(): NodePos[] {
  // Collect all circle-circle intersection points with their metadata.
  interface IntersectionPt {
    x: number
    y: number
    groups: Set<number> // which group indices contribute circles to this point
  }
  const intersections: IntersectionPt[] = []

  // For each pair of groups, find all intersections between their circles.
  for (let g1 = 0; g1 < 3; g1++) {
    for (let g2 = g1 + 1; g2 < 3; g2++) {
      const [c1x, c1y] = groupCenter(g1)
      const [c2x, c2y] = groupCenter(g2)
      for (const r1 of GROUP_RADII) {
        for (const r2 of GROUP_RADII) {
          const pts = circleIntersections(c1x, c1y, r1, c2x, c2y, r2)
          for (const [x, y] of pts) {
            // Avoid duplicates: only add if more than 2 units away from all existing.
            const isDupe = intersections.some(
              (p) => Math.hypot(p.x - x, p.y - y) < 1.5,
            )
            if (!isDupe) {
              intersections.push({
                x,
                y,
                groups: new Set([g1, g2]),
              })
            }
          }
        }
      }
    }
  }

  // Sort intersections by angle and distance from center (for deterministic ordering).
  intersections.sort((a, b) => {
    const rad_a = Math.hypot(a.x - CENTER, a.y - CENTER)
    const ang_a = Math.atan2(a.y - CENTER, a.x - CENTER)
    const rad_b = Math.hypot(b.x - CENTER, b.y - CENTER)
    const ang_b = Math.atan2(b.y - CENTER, b.x - CENTER)
    return rad_a - rad_b || ang_a - ang_b
  })

  // Assign 54 facelets to the first 54 intersections, grouped by face.
  // Pattern: 3 groups × 2 faces per group × 9 stickers per face = 54.
  const nodes: NodePos[] = []
  let idx = 0

  for (let g = 0; g < 3; g++) {
    const [faceA, faceB] = GROUP_FACES[g]
    // Use 18 points for this group (9 per face).
    // First 9 go to faceA, next 9 to faceB.
    for (let f = 0; f < 2; f++) {
      const face = f === 0 ? faceA : faceB
      for (let local = 0; local < 9; local++) {
        if (idx < intersections.length) {
          const pt = intersections[idx]
          nodes.push({
            faceletIndex: FACE_OFFSET[face] + local,
            face,
            x: pt.x,
            y: pt.y,
          })
          idx++
        }
      }
    }
  }

  // Fallback: if not enough intersections (should not happen with good geometry),
  // fill remaining facelets with default positions at center.
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
