import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isSolved, solvedState, type CubeState } from '../cube/facelet'
import {
  applyMove,
  applyMoves,
  type MoveName,
} from '../cube/moves'

type CubeStore = {
  /** The single source of truth: 54 facelet colors. Both the 3D and 2D views read this. */
  state: CubeState
  history: MoveName[]
  solved: boolean
  lastMove: MoveName | null,
  debug: boolean /** Debug mode: when true, views show facelet INDICES instead of face labels. */
  applyMove: (move: MoveName) => void
  reset: () => void
  undo: () => void
  /** Toggle (or set) debug mode. */
  setDebug: (on?: boolean) => void
}

export const allMoves = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2', 'D', "D'", 'D2', 'L', "L'", 'L2', 'B', "B'", 'B2']

export const randomMove=()=> allMoves[ Math.floor(Math.random() * allMoves.length)]

export const useCubeStore = create<CubeStore>()(
  persist(
    (set, get) => ({
      state: solvedState(),
      history: [],
      solved: true,
      lastMove: null,
      // On in development by default; toggle at runtime via setDebug.
      debug: false && import.meta.env.DEV,
      applyMove: (move) =>
        set((s) => {
          const next = applyMove(s.state, move)
          return {
            state: next,
            history: [...s.history, move],
            solved: isSolved(next),
            lastMove: move,
          }
        }),
      reset: () => set({ state: solvedState(), history: [], solved: true, lastMove: null }),

      undo: () => {
        const { history } = get()
        if (history.length === 0) return
        const nextHistory = history.slice(0, -1)
        // Recompute from solved for correctness (cheap for a 3x3).
        const next = applyMoves(solvedState(), nextHistory)
        set({ state: next, history: nextHistory, solved: isSolved(next), lastMove: null })
      },

      setDebug: (on) => set((s) => ({ debug: on ?? !s.debug })),
    }),
    {
      name: 'rubiks-cube-state',
      version: 1,
      partialize: (s) => ({ history: s.history }),
      onRehydrateStorage: () => (persisted) => {
        if (!persisted) return
        const rebuilt = applyMoves(solvedState(), persisted.history)
        persisted.state = rebuilt
        persisted.solved = isSolved(rebuilt)
      },
    },
  ),
)
