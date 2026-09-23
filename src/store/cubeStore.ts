import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { solvedState, isSolved, type CubeState } from '../cube/facelet'
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
  lastMove: { move: MoveName; seq: number } | null

  applyMove: (move: MoveName) => void
  reset: () => void
  undo: () => void
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

      applyMove: (move) =>
        set((s) => {
          const next = applyMove(s.state, move)
          return {
            state: next,
            history: [...s.history, move],
            solved: isSolved(next),
            lastMove: { move, seq: (s.lastMove?.seq ?? 0) + 1 },
          }
        }),
      reset: () => set({ state: solvedState(), history: [], solved: true }),

      undo: () => {
        const { history } = get()
        if (history.length === 0) return
        const nextHistory = history.slice(0, -1)
        // Recompute from solved for correctness (cheap for a 3x3).
        const next = applyMoves(solvedState(), nextHistory)
        set({ state: next, history: nextHistory, solved: isSolved(next) })
      },
    }),
    {
      name: 'rubiks-cube-state',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only the move history; it fully determines the cube. The
      // sticker state and solved flag are recomputed from it on load, so the
      // stored payload stays small and self-heals if the state array is ever
      // out of sync. All actions (moves, scramble, reset, undo) mutate history
      // through the store, so each is captured automatically.
      partialize: (s) => ({ history: s.history }),
      // After the persisted history is rehydrated, replay it from the solved
      // state to rebuild `state` and `solved`.
      onRehydrateStorage: () => (persisted) => {
        if (!persisted) return
        const rebuilt = applyMoves(solvedState(), persisted.history)
        persisted.state = rebuilt
        persisted.solved = isSolved(rebuilt)
      },
    },
  ),
)
