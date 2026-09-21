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

const MIDDLE_RADIUS = 22
const CIRCLE_DISTANCE = MIDDLE_RADIUS / Math.sqrt(3) // ≈ 12.7
const GROUP_ANGLES = [-90, 30, 150] // degrees
const GROUP_RADII = [16, MIDDLE_RADIUS, 28]

const GROUP_FACES: Array<[Face, Face]> = [
  ['U', 'D'],
  ['R', 'L'],
  ['F', 'B'],
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
  return [CENTER + dx, CENTER + dy]
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
  adjacentPairs.forEach((pair, pairIdx) => {
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
      (d) => Math.hypot(d.x - pt.x, d.y - pt.y) < 1.2,
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
          y: CENTER,
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

export const LAYOUT_VIEWBOX = { size: VIEW }
export const NODE_RADIUS = 1.8
