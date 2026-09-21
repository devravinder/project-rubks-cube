import { FACE_OFFSET, type Face } from '../cube/facelet'

/**
 * Fixed 2D layout for the graph/flower view, matching the reference mandala:
 *
 *  - Three large circle-families are arranged at 120 deg around the center,
 *    overlapping in a trefoil. Each family has several concentric rings; drawn
 *    together they form the dense overlapping-arcs look.
 *  - 54 sticker-nodes are laid out with 3-fold rotational symmetry: a small
 *    central cluster, plus three "arms" (one per cube axis) radiating outward,
 *    each arm holding the 18 stickers of one axis (two opposite faces).
 *
 * Coordinates are in an abstract square viewBox (0..VIEW). The SVG scales to fit.
 */

export type NodePos = { faceletIndex: number; x: number; y: number; face: Face }

const VIEW = 100
const CENTER = VIEW / 2

/**
 * The three arms point up-left, up-right, and down (120 deg apart), matching the
 * reference. Angle 0 = pointing up; we rotate by these base angles.
 */
const ARM_ANGLES = [-90, 30, 150] // degrees; up, lower-right, lower-left arms fan symmetrically

/** Which axis (pair of opposite faces) belongs to each arm. */
const ARM_FACES: Array<[Face, Face]> = [
  ['U', 'D'],
  ['R', 'L'],
  ['F', 'B'],
]

/**
 * Local node offsets within one arm, in a coordinate frame where the arm points
 * "up" (-y). 18 nodes per arm arranged as fanning rows that widen outward,
 * echoing the diamond clusters in the reference. Values are tuned to sit on the
 * concentric arcs.
 *
 * Format: [alongArm (radius from center), acrossArm (lateral)].
 */
const ARM_NODE_LOCAL: Array<[number, number]> = [
  // inner (near center) - 2 nodes
  [12, -3.5], [12, 3.5],
  // ring 2 - 3 nodes
  [20, -7], [21, 0], [20, 7],
  // ring 3 - 4 nodes
  [28, -10.5], [29, -3.5], [29, 3.5], [28, 10.5],
  // ring 4 - 4 nodes
  [37, -12], [38, -4], [38, 4], [37, 12],
  // outer ring - 5 nodes
  [46, -13], [46.5, -6.5], [47, 0], [46.5, 6.5], [46, 13],
]

function rot(x: number, y: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [x * c - y * s, x * s + y * c]
}

/**
 * Build fixed positions for all 54 nodes.
 *
 * Per arm: the first 9 facelets (one face of the axis pair) fill the "left half"
 * of the arm's rows and the other 9 fill the "right half", so a solved cube
 * shows two color-clusters per arm (as in the reference).
 */
export function buildNodeLayout(): NodePos[] {
  const nodes: NodePos[] = []

  ARM_FACES.forEach(([faceA, faceB], armIdx) => {
    const angle = ARM_ANGLES[armIdx]
    // 18 slots for this arm; map facelets: faceA -> slots 0..8, faceB -> 9..17.
    const faceForSlot = (slot: number): { face: Face; local: number } =>
      slot < 9
        ? { face: faceA, local: slot }
        : { face: faceB, local: slot - 9 }

    for (let slot = 0; slot < 18; slot++) {
      // Reuse the 18 local positions but mirror the second face across the arm
      // axis so the two faces sit on opposite sides.
      const base = ARM_NODE_LOCAL[slot % ARM_NODE_LOCAL.length]
      const along = base[0]
      const across = slot < 9 ? base[1] : -base[1]
      const [dx, dy] = rot(across, -along, angle + 90) // +90: arm "up" = -y
      const { face, local } = faceForSlot(slot)
      nodes.push({
        faceletIndex: FACE_OFFSET[face] + local,
        face,
        x: CENTER + dx,
        y: CENTER + dy,
      })
    }
  })

  return nodes
}

/**
 * The overlapping guide circles: three families (one per arm) of concentric
 * rings, each family centered slightly out along its arm — producing the
 * trefoil of intersecting circles seen in the reference.
 */
export type GuideCircle = { cx: number; cy: number; r: number }

export function guideCircles(): GuideCircle[] {
  const circles: GuideCircle[] = []
  const radii = [14, 20, 26, 32]
  ARM_ANGLES.forEach((angle) => {
    // Center of this family sits partway out along the arm.
    const [cx, cy] = rot(0, -18, angle + 90)
    for (const r of radii) {
      circles.push({ cx: CENTER + cx, cy: CENTER + cy, r })
    }
  })
  return circles
}

export const LAYOUT_VIEWBOX = { size: VIEW }
export const NODE_RADIUS = 2.1
