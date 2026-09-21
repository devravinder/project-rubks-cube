import { useEffect, useMemo, useRef, useState } from 'react'
import { useCubeStore } from '../store/cubeStore'
import { FACE_COLOR, type Face } from '../cube/facelet'
import { resolveGraphTurn } from './graphTurn'
import {
  buildNodeLayout,
  guideCircles,
  innerGroupRing,
  INNER_GROUPS,
  OPPOSITE_FACE,
  LAYOUT_VIEWBOX,
  NODE_RADIUS,
  type NodePos,
} from './layout'

const DRAG_THRESHOLD = 6

type XY = { x: number; y: number }

/**
 * The 2D graph/mandala view. One dot per sticker, arranged in the 3-fold
 * trefoil of the reference, colored by home face (decoupled from cube state
 * while we build the circle-rotation model). It subscribes to the store's
 * `lastMove` signal so button/drag/3D moves drive the 2D circle rotation.
 *
 * Rotation model (Option B — real positions):
 *  - Each inner group (U/R/F) has a circle whose ring holds 12 nodes from the 4
 *    adjacent faces, grouped into 4 arcs of 3.
 *  - A move on an INNER group rotates ITS OWN circle.
 *  - A move on an OUTER group (D/L/B) rotates its OPPOSITE inner group's circle.
 *  - Clockwise: each arc's 3 stickers advance one arc-step clockwise
 *    (arc i -> arc i+1). Prime moves go counter-clockwise.
 *  - Stickers physically move to the next arc's positions (not just a spin).
 */
export function Graph2D() {
  const applyMove = useCubeStore((s) => s.applyMove)
  const lastMove = useCubeStore((s) => s.lastMove)
  const nodes = useMemo(() => buildNodeLayout(), [])
  const circles = useMemo(() => guideCircles(), [])

  // Precompute each inner group's ring (center, radius, 4 arcs of facelet ids).
  const rings = useMemo(() => {
    const map: Record<string, ReturnType<typeof innerGroupRing>> = {}
    for (const f of INNER_GROUPS) map[f] = innerGroupRing(f, nodes)
    return map
  }, [nodes])

  // Live render positions: faceletIndex -> {x,y}. Starts at home positions and
  // is mutated by ring rotations. This is the 2D-local permutation.
  const [renderPos, setRenderPos] = useState<Record<number, XY>>(() => {
    const init: Record<number, XY> = {}
    for (const n of nodes) init[n.faceletIndex] = { x: n.x, y: n.y }
    return init
  })

  // Apply one arc-step rotation to the ring of `innerFace` (the circle that
  // owns the rotation). `clockwise` chooses arc i -> i+1 vs i -> i-1.
  const rotateRing = (innerFace: Face, clockwise: boolean) => {
    const ring = rings[innerFace]
    if (!ring) return
    const { arcs } = ring
    if (arcs.length !== 4) return

    setRenderPos((prev) => {
      const next = { ...prev }
      // Capture the CURRENT positions occupied by each arc's stickers.
      const arcPositions = arcs.map((arc) => arc.map((id) => prev[id]))
      // Move each arc's stickers to the neighbouring arc's positions.
      for (let i = 0; i < 4; i++) {
        const targetArc = clockwise ? (i + 1) % 4 : (i + 3) % 4
        const ids = arcs[i]
        const destPositions = arcPositions[targetArc]
        for (let k = 0; k < ids.length; k++) {
          next[ids[k]] = destPositions[k]
        }
      }
      return next
    })
  }

  // React to each new move: pick the circle to rotate and the direction.
  const lastSeq = useRef<number>(0)
  useEffect(() => {
    if (!lastMove || lastMove.seq === lastSeq.current) return
    lastSeq.current = lastMove.seq

    const move = lastMove.move
    const face = move[0] as Face
    const prime = move.includes("'")
    const isDouble = move.includes('2')

    // Inner group rotates its own circle; outer group rotates its opposite's.
    const innerFace = INNER_GROUPS.includes(face) ? face : OPPOSITE_FACE[face]

    // Clockwise for a base move; counter-clockwise for prime.
    const clockwise = !prime
    rotateRing(innerFace, clockwise)
    if (isDouble) rotateRing(innerFace, clockwise)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove])

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
        let closest = faceNodes[0]
        let minDist = Math.hypot(closest.x - cx, closest.y - cy)
        for (const node of faceNodes) {
          const dist = Math.hypot(node.x - cx, node.y - cy)
          if (dist < minDist) {
            minDist = dist
            closest = node
          }
        }
        positions[face] = { x: closest.x, y: closest.y }
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
        strokeWidth={0.5}
      >
        {circles.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
      </g>

      {/* Sticker nodes. Colored by their HOME face (frozen); positioned by the
          live 2D permutation (renderPos), which ring rotations mutate. */}
      <g>
        {nodes.map((node) => {
          const p = renderPos[node.faceletIndex] ?? { x: node.x, y: node.y }
          return (
            <circle
              key={node.faceletIndex}
              cx={p.x}
              cy={p.y}
              r={NODE_RADIUS}
              fill={FACE_COLOR[node.face]}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={0.25}
              className="cursor-grab touch-none"
              onPointerDown={onPointerDown(node)}
            />
          )
        })}
      </g>

      {/* Face labels at the centroid of each face cluster. */}
      <g className="text-foreground" fontSize="3" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
        {(Object.entries(faceLabelPositions) as Array<[Face, { x: number; y: number } | null]>).map(
          ([face, pos]) =>
            pos && (
              <text key={`label-${face}`} x={pos.x} y={pos.y} dy="0.1em">
                {face}
              </text>
            ),
        )}
      </g>
    </svg>
  )
}
