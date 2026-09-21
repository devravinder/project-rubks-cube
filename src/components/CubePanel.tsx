import { CubeScene } from '../three/CubeScene'

/**
 * Container for the 3D cube view. Fills its parent section and hosts the
 * React Three Fiber canvas.
 */
export function CubePanel() {
  return (
    <div className="relative h-full w-full touch-none bg-card">
      <CubeScene />
    </div>
  )
}
