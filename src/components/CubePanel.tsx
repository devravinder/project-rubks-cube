import { useRef } from 'react'
import { CubeScene } from '../three/CubeScene'

/**
 * Container for the 3D cube view. Fills its parent section and hosts the
 * React Three Fiber canvas. Shows a reset button (top-right) that restores
 * the default camera orientation.
 */
export function CubePanel() {
  const resetCameraRef = useRef<(() => void) | null>(null)

  return (
    <div className="relative h-full w-full touch-none bg-card">
      <CubeScene
        onReady={(resetCamera) => {
          resetCameraRef.current = resetCamera
        }}
      />

      {/* Top-right: reset the 3D camera view */}
      <button
        type="button"
        onClick={() => resetCameraRef.current?.()}
        className="absolute right-4 top-4 z-10 rounded-md border border-border bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Reset 3D view"
      >
        Reset view
      </button>
    </div>
  )
}
