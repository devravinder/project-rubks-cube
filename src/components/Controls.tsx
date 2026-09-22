import { Button } from './Button'
import { useCubeStore } from '../store/cubeStore'

/** Top-bar controls: scramble, undo, reset. Reads/writes the shared store. */
export function Controls() {
  const scramble = useCubeStore((s) => s.scramble)
  const reset = useCubeStore((s) => s.reset)
  const undo = useCubeStore((s) => s.undo)
  const solved = useCubeStore((s) => s.solved)
  console.log({solved})
  const historyLength = useCubeStore((s) => s.history.length)

  return (
    <div className="flex items-center gap-1.5">
      <Button onClick={() => scramble()} title="Scramble the cube">
        Scramble
      </Button>
      <Button
        variant="ghost"
        onClick={undo}
        disabled={historyLength === 0}
        title="Undo last move"
        className="px-2"
      >
        Undo
      </Button>
      <Button
        variant="ghost"
        onClick={reset}
        disabled={historyLength === 0}
        title="Reset to solved"
        className="px-2"
      >
        Reset
      </Button>
    </div>
  )
}
