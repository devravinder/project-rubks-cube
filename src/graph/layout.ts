import { FACE_OFFSET, FACES, type Face } from '../cube/facelet'

/**
 * Fixed 2D layout for the graph/flower view.
 *
 * The view mirrors the cube state: one node per sticker (54 total), positioned
 * in a symmetric arrangement. Each face is drawn as a 3x3 grid of dots; the six
 * faces are placed around a center like petals, echoing the mandala look:
 *
 *            U
 *         L  F  R  B     (F center, L/R/B around, U above, D below)
 *            D
 *
 * Positions are in an abstract viewBox coordinate space; the SVG scales to fit.
 */

export type NodePos = { faceletIndex: number; x: number; y: number; face: Face }

const VIEW = 100 // viewBox is 0..VIEW in both axes (with margin)
const CENTER = VIEW / 2
const CELL = 4.4 // spacing between dots within a face
const FACE_SPAN = CELL * 2 // width/height of a 3x3 face block (centers of corner dots)

/** Center position of each face block, arranged as an unfolded cross. */
const FACE_CENTER: Record<Face, { cx: number; cy: number }> = {
  U: { cx: CENTER, cy: CENTER - FACE_SPAN * 1.9 },
  D: { cx: CENTER, cy: CENTER + FACE_SPAN * 1.9 },
  L: { cx: CENTER - FACE_SPAN * 1.9, cy: CENTER },
  F: { cx: CENTER, cy: CENTER },
  R: { cx: CENTER + FACE_SPAN * 1.9, cy: CENTER },
  B: { cx: CENTER + FACE_SPAN * 3.8, cy: CENTER },
}

/** Build fixed positions for all 54 nodes. */
export function buildNodeLayout(): NodePos[] {
  const nodes: NodePos[] = []
  for (const face of FACES) {
    const { cx, cy } = FACE_CENTER[face]
    const offset = FACE_OFFSET[face]
    for (let i = 0; i < 9; i++) {
      const col = i % 3
      const row = Math.floor(i / 3)
      nodes.push({
        faceletIndex: offset + i,
        face,
        x: cx + (col - 1) * CELL,
        y: cy + (row - 1) * CELL,
      })
    }
  }
  return nodes
}

/** Concentric guide circles (the mandala rings), radii in viewBox units. */
export function guideCircles(): number[] {
  return [10, 16, 22, 28, 34, 40].map((r) => r)
}

export const LAYOUT_VIEWBOX = { width: VIEW + 20, height: VIEW, cx: CENTER }
export const NODE_RADIUS = 1.7
