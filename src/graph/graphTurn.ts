import type { MoveName } from '../cube/moves'
import { FACE_OFFSET } from '../cube/facelet'
import type { NodePos } from './layout'

/**
 * Map a drag on a graph node to a cube move.
 *
 * Simple, predictable mapping: dragging a node turns the FACE that node belongs
 * to. The drag direction chooses the turn direction — a clockwise-ish drag
 * (right / down) turns the face clockwise; the opposite turns it counter-clockwise.
 *
 * (The face turn is the same permutation used by the 3D view, so both stay in
 * sync via the shared store.)
 */
export function resolveGraphTurn(
  node: NodePos,
  dx: number,
  dy: number,
): MoveName | null {
  const face = node.face
  // Local index within the face (0..8); center (4) is a no-op grab target.
  const local = node.faceletIndex - FACE_OFFSET[face]
  if (local === 4) return null

  // Clockwise if dragging right or down; counter-clockwise if left or up.
  const clockwise = Math.abs(dx) >= Math.abs(dy) ? dx > 0 : dy > 0
  return (clockwise ? face : `${face}'`) as MoveName
}
