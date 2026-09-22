import type { CubeState } from '../cube/facelet'
import type { MoveName } from '../cube/moves'
// min2phase provides an ESM default export (added at the file's end).
import min2phase from '../lib/min2phase.js'

/**
 * Our CubeState is already the min2phase facelet format: 54 face letters in
 * U,R,F,D,L,B order, row-major per face. So the string is just a join.
 */
function toFacelets(state: CubeState): string {
  return state.join('')
}

/** Parse min2phase's solution string ("U R2 F' ...") into MoveName tokens. */
function parseSolution(raw: string): MoveName[] {
  return raw
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => t as MoveName)
}

let warmed = false

/** Warm up the solver's pruning tables (optional; first solve does it lazily). */
export function warmUpSolver(): void {
  if (warmed) return
  try {
    min2phase.initFull()
    warmed = true
  } catch {
    // Ignore — solve() will fall back to partial init.
  }
}

export type SolveResult =
  | { ok: true; moves: MoveName[] }
  | { ok: false; error: string }

/**
 * Compute a near-optimal solution (Kociemba two-phase) for the given cube state.
 * Returns the list of moves that solves it (empty list if already solved).
 */
export function solveCube(state: CubeState): SolveResult {
  const facelets = toFacelets(state)
  let raw: string
  try {
    raw = min2phase.solve(facelets)
  } catch (e) {
    return { ok: false, error: `Solver failed: ${(e as Error).message}` }
  }
  // min2phase returns an error string starting with "Error" for bad input.
  if (/error/i.test(raw)) {
    return { ok: false, error: raw.trim() }
  }
  return { ok: true, moves: parseSolution(raw) }
}
