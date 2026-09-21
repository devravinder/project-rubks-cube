/**
 * Container for the 2D graph (flower/mandala) view. Fills its parent section.
 * The actual SVG graph is added in a later task.
 */
export function GraphPanel() {
  return (
    <div className="relative h-full w-full bg-background">
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-sm text-muted-foreground">2D graph (coming soon)</span>
      </div>
    </div>
  )
}
