import { Button } from './Button'
import { useCubeStore } from '../store/cubeStore'
import { ALL_BASE_MOVES, invertMove, type MoveName } from '../cube/moves'

/**
 * A compact grid of tappable moves (U R F D L B and their inverses).
 * Useful on touch devices and as a precise alternative to dragging.
 */
export function MovePad() {
  const applyMove = useCubeStore((s) => s.applyMove)

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {ALL_BASE_MOVES.map((move) => (
        <div key={move} className="flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => applyMove(move)}
            className="h-8 w-8 bg-secondary text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title={`${move} (clockwise)`}
          >
            {move}
          </button>
          <button
            type="button"
            onClick={() => applyMove(invertMove(move) as MoveName)}
            className="h-8 w-8 border-l border-border bg-secondary text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title={`${move}' (counter-clockwise)`}
          >
            {move}&#39;
          </button>
        </div>
      ))}
    </div>
  )
}
