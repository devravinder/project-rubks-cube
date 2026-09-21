import { useCubeStore } from '../store/cubeStore'
import { cn } from '../lib/utils'

/** Small badge: solved/scrambled state and move count. */
export function StatusBadge() {
  const solved = useCubeStore((s) => s.solved)
  const moves = useCubeStore((s) => s.history.length)

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5',
          solved
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            solved ? 'bg-primary' : 'bg-muted-foreground',
          )}
        />
        {solved ? 'Solved' : 'Scrambled'}
      </span>
      <span>{moves} moves</span>
    </div>
  )
}
