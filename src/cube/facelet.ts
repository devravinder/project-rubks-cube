/**
 * Facelet model for a 3x3 Rubik's cube.
 *
 * The cube has 6 faces, 9 stickers each = 54 stickers. Stickers are indexed
 * 0..53, grouped by face in the order U, R, F, D, L, B (standard Kociemba
 * ordering). Within each face the 9 stickers are numbered row-major (0..8) as
 * seen when looking directly at that face:
 *
 *        0 1 2
 *        3 4 5
 *        6 7 8
 *
 * Index 4 of each face is the fixed center; centers never move, so a sticker's
 * center defines that face's solved color.
 */

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'

export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

/** Offset of each face's first sticker within the 54-length facelet array. */
export const FACE_OFFSET: Record<Face, number> = {
  U: 0,
  R: 9,
  F: 18,
  D: 27,
  L: 36,
  B: 45,
}

export const FACE_COLOR: Record<Face, string> = {
  U: '#ffffff', // white
  R: '#ff0000', // red
  F: '#00cc00', // green
  D: '#ffe000', // yellow
  L: '#ff7000', // orange
  B: '#0066ff', // blue
}

/** A cube state is a 54-length array of face letters (the sticker colors). */
export type CubeState = Face[]

/** The solved cube: each face filled with its own letter. */
export function solvedState(): CubeState {
  const state: Face[] = []
  for (const face of FACES) {
    for (let i = 0; i < 9; i++) state.push(face)
  }
  return state
}

/** True when every face is a single uniform color. */
export function isSolved(state: CubeState): boolean {
  for (let f = 0; f < 6; f++) {
    const base = f * 9
    const color = state[base]
    for (let i = 1; i < 9; i++) {
      if (state[base + i] !== color) return false
    }
  }
  return true
}
