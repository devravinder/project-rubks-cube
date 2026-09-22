import { useState } from 'react'
import { useCubeStore } from '../store/cubeStore'
import { solveCube, warmUpSolver } from '../solver/solve'
import type { MoveName } from '../cube/moves'

/**
 * Hint feature: a bottom-right icon that computes a near-optimal solution
 * (Kociemba two-phase via min2phase) for the current cube state and lists the
 * moves vertically. Clicking a move applies it, stepping the cube toward solved.
 */
export function HintPanel() {
  const state = useCubeStore((s) => s.state)
  const solved = useCubeStore((s) => s.solved)
  const applyMove = useCubeStore((s) => s.applyMove)

  const [open, setOpen] = useState(false)
  const [moves, setMoves] = useState<MoveName[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // How many leading steps have been applied. Steps are applied in order, so an
  // index < appliedCount is done (disabled) and the next clickable step is at
  // index === appliedCount.
  const [appliedCount, setAppliedCount] = useState(0)

  const compute = () => {
    setLoading(true)
    setError(null)
    setAppliedCount(0)
    // Defer so the loading state paints before the (possibly slow) first solve.
    setTimeout(() => {
      warmUpSolver()
      const res = solveCube(state)
      if (res.ok) {
        setMoves(res.moves)
      } else {
        setMoves(null)
        setError(res.error)
      }
      setLoading(false)
    }, 0)
  }

  // Apply the step at index `i` (only the next pending step is clickable) and
  // mark it done so it can't be clicked again.
  const applyStep = (i: number, mv: MoveName) => {
    if (i !== appliedCount) return
    applyMove(mv)
    setAppliedCount(i + 1)
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) compute()
  }

  return (
    <>
      {/* Bottom-right hint icon */}
      <button
        type="button"
        onClick={toggle}
        aria-label="Show solution hint"
        aria-expanded={open}
        className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-md backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
        title="Hint: how to solve"
      >
        {/* Lightbulb icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
        </svg>
      </button>

      {/* Solution steps panel */}
      {open && (
        <div className="absolute bottom-16 right-4 z-10 max-h-[60%] w-44 overflow-y-auto rounded-lg border border-border bg-background/95 p-3 shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Solution</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close hint"
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground">Solving…</p>
          )}

          {!loading && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && solved && (
            <p className="text-sm text-muted-foreground">Already solved 🎉</p>
          )}

          {!loading && !error && !solved && moves && moves.length > 0 && (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                {appliedCount}/{moves.length} done — tap the next step
              </p>
              <ol className="flex flex-col gap-1">
                {moves.map((mv, i) => {
                  const done = i < appliedCount
                  const isNext = i === appliedCount
                  return (
                    <li key={`${mv}-${i}`}>
                      <button
                        type="button"
                        onClick={() => applyStep(i, mv)}
                        disabled={!isNext}
                        aria-disabled={!isNext}
                        className={[
                          'flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-sm font-medium transition-colors',
                          done
                            ? 'border-border bg-muted text-muted-foreground line-through opacity-60'
                            : isNext
                              ? 'border-primary bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
                              : 'border-border bg-secondary text-muted-foreground opacity-50',
                        ].join(' ')}
                        title={
                          done
                            ? `${mv} (done)`
                            : isNext
                              ? `Apply ${mv}`
                              : `${mv} (do earlier steps first)`
                        }
                      >
                        <span className="w-5 text-right text-xs text-muted-foreground">
                          {i + 1}.
                        </span>
                        <span className="font-mono">{mv}</span>
                        {done && <span className="ml-auto text-xs">✓</span>}
                      </button>
                    </li>
                  )
                })}
              </ol>
              {appliedCount === moves.length && (
                <p className="mt-2 text-sm text-muted-foreground">
                  All steps applied 🎉
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
