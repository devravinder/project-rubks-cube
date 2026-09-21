import { FACE_OFFSET, FACES, type Face } from '../cube/facelet'

/**
 * Simplified layout: place 54 stickers at actual circle intersection points.
 *
 * Strategy:
 *  1. Compute ALL intersections between circles from DIFFERENT groups
 *  2. Deduplicate to remove near-identical points
 *  3. Take the first 54 (or as many as exist)
 *  4. Assign to faces by spatial region (angle from center)
 */

export type NodePos = { faceletIndex: number; x: number; y: number; face: Face }

const VIEW = 100
const CENTER = VIEW / 2

/**
 * KEY CONSTRAINT: Through each group's center, another group's MIDDLE circle passes.
 * This means: distance between adjacent group centers = MIDDLE_RADIUS.
 * For a triangle with 120° angles and side length = MIDDLE_RADIUS:
 *   circumradius = MIDDLE_RADIUS / sqrt(3)
 * So we place group centers at this distance from CENTER.
 */
const MIDDLE_RADIUS = 22
const CIRCLE_DISTANCE = MIDDLE_RADIUS / Math.sqrt(3) // ≈ 12.7
const GROUP_ANGLES = [-90, 30, 150]
const GROUP_RADII = [18, MIDDLE_RADIUS, 26]

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
 */
export function buildNodeLayout(): NodePos[] {
  interface RawPoint {
    x: number
    y: number
    angle: number
    dist: number
  }

  const allPoints: RawPoint[] = []

  // Compute intersections between circles from DIFFERENT groups
  for (let g1 = 0; g1 < 3; g1++) {
    for (let g2 = g1 + 1; g2 < 3; g2++) {
      const [c1x, c1y] = groupCenter(g1)
      const [c2x, c2y] = groupCenter(g2)

      for (const r1 of GROUP_RADII) {
        for (const r2 of GROUP_RADII) {
          const pts = circleIntersections(c1x, c1y, r1, c2x, c2y, r2)
          for (const [x, y] of pts) {
            const dx = x - CENTER
            const dy = y - CENTER
            allPoints.push({
              x,
              y,
              angle: Math.atan2(dy, dx),
              dist: Math.hypot(dx, dy),
            })
          }
        }
      }
    }
  }

  // Deduplicate: keep points that are > 2.0 units apart
  const deduped: RawPoint[] = []
  for (const pt of allPoints) {
    const isDupe = deduped.some(
      (d) => Math.hypot(d.x - pt.x, d.y - pt.y) < 2.0,
    )
    if (!isDupe) deduped.push(pt)
  }

  // Sort by angle (starting from -90 degrees, going counterclockwise)
  deduped.sort((a, b) => a.angle - b.angle)

  // Assign to faces based on angular regions
  // 6 faces, so divide the circle into 6 regions of ~60 degrees each
  // Map angle regions to faces:
  // Region 0 (top, -90 to -30): U
  // Region 1 (-30 to 30): R
  // Region 2 (30 to 90): D
  // Region 3 (90 to 150): L
  // Region 4 (150 to -150): B
  // Region 5 (-150 to -90): F
  
  const faceForAngle = (angle: number): Face => {
    // Normalize angle to [0, 2π]
    let norm = angle
    if (norm < 0) norm += 2 * Math.PI
    
    // Divide into 6 regions of 60° each
    // Offset by 30° so boundaries are at ±30°, 90°, 150°, ±150°, -90°
    const regionAngle = ((norm + Math.PI / 6) % (2 * Math.PI)) / (Math.PI / 3)
    const region = Math.floor(regionAngle) % 6
    
    // Map regions to faces (adjusted for the reference layout)
    const faces: Face[] = ['R', 'D', 'L', 'B', 'U', 'F']
    return faces[region]
  }

  const nodes: NodePos[] = []
  const faceStickers: Record<Face, Array<{ x: number; y: number }>> = {
    U: [],
    D: [],
    R: [],
    L: [],
    F: [],
    B: [],
  }

  // Assign deduplicated intersection points to faces by angle, preserving coordinates
  for (const pt of deduped) {
    const face = faceForAngle(pt.angle)
    faceStickers[face].push({ x: pt.x, y: pt.y })
  }

  // Now map each face's stickers to local indices 0..8, using exact coordinates
  for (const face of FACES) {
    const stickers = faceStickers[face]
    for (let local = 0; local < 9 && local < stickers.length; local++) {
      nodes.push({
        faceletIndex: FACE_OFFSET[face] + local,
        face,
        x: stickers[local].x,
        y: stickers[local].y,
      })
    }
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
