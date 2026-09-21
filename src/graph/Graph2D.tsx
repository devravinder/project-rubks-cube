import { useMemo, useRef } from 'react'
import { useCubeStore } from '../store/cubeStore'
import { FACE_COLOR, type Face } from '../cube/facelet'
import { resolveGraphTurn } from './graphTurn'
import {
  buildNodeLayout,
  guideCircles,
  LAYOUT_VIEWBOX,
  NODE_RADIUS,
  type NodePos,
} from './layout'

const DRAG_THRESHOLD = 6 // viewBox-independent px threshold on the raw pointer

/**
 * The 2D graph/flower view. Renders one dot per sticker, colored from the same
 * shared state as the 3D cube, so both views stay in sync. Dragging a node
 * triggers the corresponding face turn (which updates the shared store).
 */
export function Graph2D() {
  const state = useCubeStore((s) => s.state)
  const applyMove = useCubeStore((s) => s.applyMove)
  const nodes = useMemo(() => buildNodeLayout(), [])
  const rings = useMemo(() => guideCircles(), [])

  const drag = useRef<{ node: NodePos; startX: number; startY: number } | null>(null)

  const onPointerDown = (node: NodePos) => (e: React.PointerEvent) => {
    drag.current = { node, startX: e.clientX, startY: e.clientY }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
    const move = resolveGraphTurn(d.node, dx, dy)
    drag.current = null
    if (move) applyMove(move)
  }

  const onPointerUp = () => {
    drag.current = null
  }

  return (
    <svg
      viewBox={`0 0 ${LAYOUT_VIEWBOX.width} ${LAYOUT_VIEWBOX.height}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="img"
      aria-label="2D graph view of the cube state"
    >
      {/* Concentric guide rings (mandala). */}
      <g className="text-border" stroke="currentColor" fill="none" strokeWidth={0.25} opacity={0.5}>
        {rings.map((r) => (
          <circle key={r} cx={LAYOUT_VIEWBOX.cx} cy={LAYOUT_VIEWBOX.height / 2} r={r} />
        ))}
      </g>

      {/* Sticker nodes. */}
      <g>
        {nodes.map((node) => (
          <circle
            key={node.faceletIndex}
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS}
            fill={FACE_COLOR[state[node.faceletIndex] as Face]}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={0.2}
            className="cursor-grab touch-none"
            onPointerDown={onPointerDown(node)}
          />
        ))}
      </g>
    </svg>
  )
}
