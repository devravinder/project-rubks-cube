import { Button } from './Button'
import { randomMove, useCubeStore } from '../store/cubeStore'
import type { MoveName } from '../cube/moves';

export const sleep = async(ms: number = 200)=>new Promise(resolve => setTimeout(resolve, ms));

/** Top-bar controls: scramble, undo, reset. Reads/writes the shared store. */
export function Controls() {
  const applyMove = useCubeStore((s) => s.applyMove)
  const reset = useCubeStore((s) => s.reset)
  const undo = useCubeStore((s) => s.undo)
  const historyLength = useCubeStore((s) => s.history.length)

  const scramble = async()=>{
      for(let i=0; i < 20 ; i++){
        const move = randomMove() as MoveName
        console.log(move)
        applyMove(move)
        await sleep()
      }
  }

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
