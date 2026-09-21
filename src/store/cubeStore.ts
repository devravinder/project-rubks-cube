import { create } from 'zustand'
import { solvedState, isSolved, type CubeState } from '../cube/facelet'
import {
  applyMove,
  applyMoves,
  randomScramble,
  type MoveName,
} from '../cube/moves'

type CubeStore = {
  /** The single source of truth: 54 facelet colors. Both the 3D and 2D views read this. */
  state: CubeState
  /** History of applied moves (for undo / display). */
  history: MoveName[]
  /** Whether the cube is currently solved. */
  solved: boolean

  /** Apply a single move and record it. */
  applyMove: (move: MoveName) => void
  /** Apply several moves at once (e.g. a scramble or solution). */
  applyMoves: (moves: MoveName[]) => void
  /** Scramble the cube with a random sequence. */
  scramble: (length?: number) => MoveName[]
  /** Reset to the solved state. */
  reset: () => void
  /** Undo the last move. */
  undo: () => void
}

export const useCubeStore = create<CubeStore>((set, get) => ({
  state: solvedState(),
  history: [],
  solved: true,

  applyMove: (move) =>
    set((s) => {
      const next = applyMove(s.state, move)
      return { state: next, history: [...s.history, move], solved: isSolved(next) }
    }),

  applyMoves: (moves) =>
    set((s) => {
      const next = applyMoves(s.state, moves)
      return {
        state: next,
        history: [...s.history, ...moves],
        solved: isSolved(next),
      }
    }),

  scramble: (length = 25) => {
    const moves = randomScramble(length)
    set((s) => {
      const next = applyMoves(s.state, moves)
      return {
        state: next,
        history: [...s.history, ...moves],
        solved: isSolved(next),
      }
    })
    return moves
  },

  reset: () => set({ state: solvedState(), history: [], solved: true }),

  undo: () => {
    const { history } = get()
    if (history.length === 0) return
    const nextHistory = history.slice(0, -1)
    // Recompute from solved for correctness (cheap for a 3x3).
    const next = applyMoves(solvedState(), nextHistory)
    set({ state: next, history: nextHistory, solved: isSolved(next) })
  },
}))
