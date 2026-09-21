import { FACE_OFFSET, type CubeState, type Face } from './facelet'

/**
 * Move engine.
 *
 * Each basic clockwise quarter-turn (U, R, F, D, L, B) is expressed as a set of
 * 4-cycles over the 54 facelet indices. Applying the permutation transforms one
 * CubeState into the next. Counter-clockwise ("prime") and double ("2") moves
 * are derived by applying the base permutation 3x or 2x respectively.
 *
 * Facelet indices (Kociemba layout), U/R/F/D/L/B each 0..8 row-major:
 *   U: 0..8    R: 9..17   F: 18..26   D: 27..35   L: 36..44   B: 45..53
 */

export type MoveName =
  | 'U' | "U'" | 'U2'
  | 'R' | "R'" | 'R2'
  | 'F' | "F'" | 'F2'
  | 'D' | "D'" | 'D2'
  | 'L' | "L'" | 'L2'
  | 'B' | "B'" | 'B2'

const U = FACE_OFFSET.U
const R = FACE_OFFSET.R
const F = FACE_OFFSET.F
const D = FACE_OFFSET.D
const L = FACE_OFFSET.L
const B = FACE_OFFSET.B

/**
 * Rotating a single face 90 deg clockwise permutes its own 8 outer stickers.
 * Row-major indices 0,1,2,5,8,7,6,3 go clockwise around the face; center (4)
 * stays put. As 4-cycles: (0 2 8 6)(1 5 7 3).
 */
function faceSelfCycles(base: number): number[][] {
  return [
    [base + 0, base + 2, base + 8, base + 6],
    [base + 1, base + 5, base + 7, base + 3],
  ]
}

/**
 * Cycles for the surrounding stickers of each clockwise quarter-turn.
 * Each inner array is a 4-cycle: a -> b -> c -> d -> a.
 * These follow the standard Kociemba facelet adjacency.
 */
const MOVE_CYCLES: Record<'U' | 'R' | 'F' | 'D' | 'L' | 'B', number[][]> = {
  U: [
    ...faceSelfCycles(U),
    [B + 2, R + 2, F + 2, L + 2],
    [B + 1, R + 1, F + 1, L + 1],
    [B + 0, R + 0, F + 0, L + 0],
  ],
  D: [
    ...faceSelfCycles(D),
    [F + 6, R + 6, B + 6, L + 6],
    [F + 7, R + 7, B + 7, L + 7],
    [F + 8, R + 8, B + 8, L + 8],
  ],
  R: [
    ...faceSelfCycles(R),
    [U + 2, B + 6, D + 2, F + 2],
    [U + 5, B + 3, D + 5, F + 5],
    [U + 8, B + 0, D + 8, F + 8],
  ],
  L: [
    ...faceSelfCycles(L),
    [U + 0, F + 0, D + 0, B + 8],
    [U + 3, F + 3, D + 3, B + 5],
    [U + 6, F + 6, D + 6, B + 2],
  ],
  F: [
    ...faceSelfCycles(F),
    [U + 6, R + 0, D + 2, L + 8],
    [U + 7, R + 3, D + 1, L + 5],
    [U + 8, R + 6, D + 0, L + 2],
  ],
  B: [
    ...faceSelfCycles(B),
    [U + 2, L + 0, D + 6, R + 8],
    [U + 1, L + 3, D + 7, R + 5],
    [U + 0, L + 6, D + 8, R + 2],
  ],
}

/** Apply one set of 4-cycles (clockwise) to a copy of the state. */
function applyCycles(state: CubeState, cycles: number[][]): CubeState {
  const next = state.slice() as CubeState
  for (const cycle of cycles) {
    // a -> b -> c -> d -> a  (value at a moves to b, etc.)
    const last = cycle.length - 1
    for (let i = last; i >= 0; i--) {
      const from = cycle[i === 0 ? last : i - 1]
      const to = cycle[i]
      next[to] = state[from]
    }
  }
  return next
}

/** Parse a move name into its base face and how many clockwise quarter-turns. */
function parseMove(move: MoveName): { base: 'U' | 'R' | 'F' | 'D' | 'L' | 'B'; turns: number } {
  const face = move[0] as 'U' | 'R' | 'F' | 'D' | 'L' | 'B'
  if (move.endsWith('2')) return { base: face, turns: 2 }
  if (move.endsWith("'")) return { base: face, turns: 3 }
  return { base: face, turns: 1 }
}

/** Apply a move to a state, returning a new state (immutably). */
export function applyMove(state: CubeState, move: MoveName): CubeState {
  const { base, turns } = parseMove(move)
  const cycles = MOVE_CYCLES[base]
  let next = state
  for (let t = 0; t < turns; t++) {
    next = applyCycles(next, cycles)
  }
  return next
}

/** Apply a sequence of moves in order. */
export function applyMoves(state: CubeState, moves: MoveName[]): CubeState {
  return moves.reduce(applyMove, state)
}

export const ALL_BASE_MOVES: MoveName[] = ['U', 'R', 'F', 'D', 'L', 'B']
export const ALL_MOVES: MoveName[] = [
  'U', "U'", 'U2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
  'D', "D'", 'D2',
  'L', "L'", 'L2',
  'B', "B'", 'B2',
]

/** The face a move turns (used by interaction code). */
export function moveFace(move: MoveName): Face {
  return move[0] as Face
}

/** Invert a move (U -> U', U' -> U, U2 -> U2). */
export function invertMove(move: MoveName): MoveName {
  if (move.endsWith('2')) return move
  if (move.endsWith("'")) return move.slice(0, 1) as MoveName
  return (move + "'") as MoveName
}

/** Generate a random scramble of the given length (no immediately redundant moves). */
export function randomScramble(length = 25): MoveName[] {
  const faces: Array<'U' | 'R' | 'F' | 'D' | 'L' | 'B'> = ['U', 'R', 'F', 'D', 'L', 'B']
  const suffixes = ['', "'", '2']
  const moves: MoveName[] = []
  let prevFace = ''
  for (let i = 0; i < length; i++) {
    let face = faces[Math.floor(Math.random() * faces.length)]
    while (face === prevFace) {
      face = faces[Math.floor(Math.random() * faces.length)]
    }
    prevFace = face
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    moves.push((face + suffix) as MoveName)
  }
  return moves
}
