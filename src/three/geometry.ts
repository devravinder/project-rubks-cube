import { FACE_OFFSET, type Face } from '../cube/facelet'

/**
 * Maps the abstract 54-facelet model onto 3D geometry.
 *
 * Coordinate system (right-handed, matches three.js):
 *   +x = Right (R),  -x = Left (L)
 *   +y = Up (U),     -y = Down (D)
 *   +z = Front (F),  -z = Back (B)
 *
 * A cubie lives at integer coords (x,y,z) each in {-1,0,1}. A sticker sits on
 * one outer face of a cubie, facing along a unit normal.
 */

export type Vec3 = [number, number, number]

/** Outward normal for each face. */
export const FACE_NORMAL: Record<Face, Vec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

export type StickerDef = {
  /** Index into the 54-length facelet array. */
  faceletIndex: number
  /** Which cubie this sticker belongs to (grid coords -1..1). */
  cubie: Vec3
  /** Which face/normal the sticker points along. */
  face: Face
  normal: Vec3
}

/**
 * For a face, map its 9 row-major sticker indices (0..8) to cubie grid coords.
 * The two in-plane axes (u across, v down) depend on the face's orientation so
 * that sticker 0 is the visually top-left when looking at that face from
 * outside, matching the facelet numbering used by the move engine.
 *
 * Each entry returns the cubie coordinate for local (col, row), col/row in 0..2.
 */
const faceToCubie: Record<Face, (col: number, row: number) => Vec3> = {
  // Looking down the +y axis. Top row (row 0) is the back (-z); left (col 0) is -x.
  U: (col, row) => [col - 1, 1, row - 1],
  // Looking up the -y axis. Top row is front (+z); left is -x.
  D: (col, row) => [col - 1, -1, 1 - row],
  // Looking along -x (from +x). Top row is up (+y); left is back (-z).
  R: (col, row) => [1, 1 - row, col - 1],
  // Looking along +x (from -x). Top row is up; left is front (+z).
  L: (col, row) => [-1, 1 - row, 1 - col],
  // Looking along -z (from +z). Top row is up; left is left (-x).
  F: (col, row) => [col - 1, 1 - row, 1],
  // Looking along +z (from -z). Top row is up; left is right (+x).
  B: (col, row) => [1 - col, 1 - row, -1],
}

/** Build the full list of 54 sticker definitions. */
export function buildStickerDefs(): StickerDef[] {
  const defs: StickerDef[] = []
  ;(Object.keys(FACE_OFFSET) as Face[]).forEach((face) => {
    const offset = FACE_OFFSET[face]
    for (let i = 0; i < 9; i++) {
      const col = i % 3
      const row = Math.floor(i / 3)
      defs.push({
        faceletIndex: offset + i,
        cubie: faceToCubie[face](col, row),
        face,
        normal: FACE_NORMAL[face],
      })
    }
  })
  return defs
}

/** Unique list of the 26 visible cubie coordinates (excludes the hidden core). */
export function buildCubies(): Vec3[] {
  const cubies: Vec3[] = []
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue
        cubies.push([x, y, z])
      }
    }
  }
  return cubies
}

/** Key helper for a cubie coordinate. */
export function cubieKey(c: Vec3): string {
  return `${c[0]},${c[1]},${c[2]}`
}
