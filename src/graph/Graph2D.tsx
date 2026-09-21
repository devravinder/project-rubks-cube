import { useMemo, useRef } from 'react'
import { useCubeStore } from '../store/cubeStore'
import { FACE_COLOR, FACE_OFFSET, type Face } from '../cube/facelet'
import { resolveGraphTurn } from './graphTurn'
import {
  buildNodeLayout,
  guideCircles,
  LAYOUT_VIEWBOX,
  NODE_RADIUS,
  type NodePos,
} from './layout'

const DRAG_THRESHOLD = 6

/**
 * The 2D graph/mandala view. One dot per sticker, colored from the same shared
 * state as the 3D cube, arranged in the 3-fold trefoil of the reference. The
 * overlapping concentric circles are the cycle "tracks". Dragging a node turns
 * the corresponding face (updating the shared store, so both views stay synced).
 */
export function Graph2D() {
  const state = useCubeStore((s) => s.state)
  const applyMove = useCubeStore((s) => s.applyMove)
  const nodes = useMemo(() => buildNodeLayout(), [])
  const circles = useMemo(() => guideCircles(), [])

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

  const size = LAYOUT_VIEWBOX.size

  // Compute face label positions: place at the centroid of each face's stickers
  const faceLabelPositions = useMemo(() => {
    const positions: Record<Face, { x: number; y: number } | null> = {
      U: null,
      D: null,
      R: null,
      L: null,
      F: null,
      B: null,
    }
    for (const face of ['U', 'D', 'R', 'L', 'F', 'B'] as const) {
      const faceNodes = nodes.filter((n) => n.face === face)
      if (faceNodes.length > 0) {
        const cx = faceNodes.reduce((s, n) => s + n.x, 0) / faceNodes.length
        const cy = faceNodes.reduce((s, n) => s + n.y, 0) / faceNodes.length
        positions[face] = { x: cx, y: cy }
      }
    }
    return positions
  }, [nodes])

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="img"
      aria-label="2D graph view of the cube state"
    >
      {/* Overlapping concentric guide circles (the cycle tracks). */}
      <g
        className="text-border"
        stroke="currentColor"
        fill="none"
        strokeWidth={0.3}
        opacity={0.55}
      >
        {circles.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
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
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={0.25}
            className="cursor-grab touch-none"
            onPointerDown={onPointerDown(node)}
          />
        ))}
      </g>

      {/* Face labels at the center (5th) sticker of each face. */}
      <g className="text-foreground" fontSize="4" fontWeight="bold" textAnchor="middle">
        {(Object.entries(faceLabelPositions) as Array<[Face, { x: number; y: number } | null]>).map(
          ([face, pos]) =>
            pos && (
              <text key={`label-${face}`} x={pos.x} y={pos.y} dy="0.35em">
                {face}
              </text>
            ),
        )}
      </g>
    </svg>
  )
}
