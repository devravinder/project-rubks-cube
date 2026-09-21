import type { Face } from '../cube/facelet'
import type { MoveName } from '../cube/moves'
import type { Vec3 } from './geometry'

/**
 * Turn resolution: translate a drag on a face into a cube move.
 *
 * When the user drags across a sticker, the drag has a direction roughly in the
 * plane of that face. The layer that turns is perpendicular to BOTH the face
 * normal and the drag direction. We pick the world axis (x/y/z) closest to the
 * cross product (normal x drag) as the rotation axis, then map (axis, layer,
 * spin sign) to a standard move.
 */

/** The rotation axis of each face move and which coordinate/value it fixes. */
type AxisInfo = {
  axis: 'x' | 'y' | 'z'
  /** The coordinate value of the layer that this face's move rotates. */
  layer: number
  /** Move for a positive (right-hand rule about +axis) turn... resolved per face. */
}

/** Standard face for a given axis + layer coordinate. */
const FACE_FOR_AXIS_LAYER: Record<'x' | 'y' | 'z', Record<number, Face>> = {
  x: { 1: 'R', [-1]: 'L' },
  y: { 1: 'U', [-1]: 'D' },
  z: { 1: 'F', [-1]: 'B' },
}

/** Dominant axis (and its sign) of a 3-vector. */
function dominantAxis(v: Vec3): { axis: 'x' | 'y' | 'z'; sign: number } {
  const ax = Math.abs(v[0])
  const ay = Math.abs(v[1])
  const az = Math.abs(v[2])
  if (ax >= ay && ax >= az) return { axis: 'x', sign: Math.sign(v[0]) || 1 }
  if (ay >= ax && ay >= az) return { axis: 'y', sign: Math.sign(v[1]) || 1 }
  return { axis: 'z', sign: Math.sign(v[2]) || 1 }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

const axisIndex = { x: 0, y: 1, z: 2 } as const

/**
 * Resolve a layer turn.
 *
 * @param cubie   grid coords of the cubie the drag started on (-1..1 each)
 * @param normal  outward normal of the clicked face
 * @param dragDir approximate drag direction in world space
 * @returns the move to apply, the rotation axis, the layer coordinate value,
 *          and the signed angle (radians) to animate to (±PI/2).
 */
export function resolveTurn(
  cubie: Vec3,
  normal: Vec3,
  dragDir: Vec3,
): { move: MoveName; axis: 'x' | 'y' | 'z'; layer: number; angle: number } | null {
  // Rotation axis is perpendicular to both the face normal and the drag.
  const rot = cross(normal, dragDir)
  const { axis } = dominantAxis(rot)

  // The layer that turns is the cubie's coordinate along that axis.
  const layer = cubie[axisIndex[axis]]

  // Only outer layers (±1) map to a standard face move; skip middle slices.
  if (layer !== 1 && layer !== -1) return null

  const face = FACE_FOR_AXIS_LAYER[axis][layer]

  // Sign of rotation about the +axis. rot points along +/-axis; use its sign.
  const rotSign = Math.sign(rot[axisIndex[axis]]) || 1

  // A face's clockwise move (as seen from outside that face) corresponds to a
  // negative rotation about the outward axis for +faces and positive for -faces.
  // Determine the move suffix from the combined sign.
  const clockwise = layer === 1 ? rotSign < 0 : rotSign > 0

  const move = (clockwise ? face : (face + "'")) as MoveName
  // Angle animates the pivot group about the world axis. Clockwise-from-outside
  // for a +face is a negative angle about +axis; keep consistent with rotSign.
  const angle = (rotSign > 0 ? 1 : -1) * (Math.PI / 2)

  return { move, axis, layer, angle }
}
