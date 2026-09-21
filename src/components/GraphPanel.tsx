import { Graph2D } from '../graph/Graph2D'

/**
 * Container for the 2D graph (flower/mandala) view. Fills its parent section
 * and hosts the SVG graph, which mirrors the shared cube state.
 */
export function GraphPanel() {
  return (
    <div className="relative h-full w-full touch-none bg-background p-3">
      <Graph2D />
    </div>
  )
}
