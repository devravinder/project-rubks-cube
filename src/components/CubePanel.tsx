/**
 * Container for the 3D cube view. Fills its parent section.
 * The actual React Three Fiber canvas is added in the next task.
 */
export function CubePanel() {
  return (
    <div className="relative h-full w-full bg-card">
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-sm text-muted-foreground">3D cube (coming next)</span>
      </div>
    </div>
  )
}
