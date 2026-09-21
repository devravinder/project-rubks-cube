import { useMemo, useRef } from 'react'
import { useCubeStore } from '../store/cubeStore'
import { FACE_COLOR, type Face } from '../cube/facelet'
import { resolveGraphTurn } from './graphTurn'
import {
  buildNodeLayout,
  guideCircles,
  innerGroupRings,
  INNER_GROUPS,
  OPPOSITE_FACE,
  RING_QUARTER_STEP,
  LAYOUT_VIEWBOX,
  NODE_RADIUS,
  type NodePos,
  type Ring,
} from './layout'

const DRAG_THRESHOLD = 6

type XY = { x: number; y: number }

const RING_KEYS = INNER_GROUPS.flatMap((f) => [`${f}:inner`, `${f}:outer`])

/**
 * The 2D graph/mandala view. Colored by home face (decoupled from cube state).
 *
 * Rotation model (canonical 12-slot + history-derived offset):
 *  - Each inner group (U/R/F) has an INNER and OUTER ring; each is 12 slots
 *    ordered clockwise (0..11). The MIDDLE ring is static.
 *  - A quarter-turn shifts a ring's occupants by 3 slots (12/4). CW = +3, CCW = -3.
 *  - Inner-group move (U) rotates its INNER ring; the opposite face (D) rotates
 *    the OUTER ring (U's outer == D's inner).
 *  - Per-ring offset is derived by folding the move HISTORY, so the 2D view
 *    survives refresh with no extra storage and always matches the cube.
 */
export function Graph2D() {
  const applyMove = useCubeStore((s) => s.applyMove)
  const history = useCubeStore((s) => s.history)
  const nodes = useMemo(() => buildNodeLayout(), [])
  const circles = useMemo(() => guideCircles(), [])

  // Build the 6 rings (U/R/F × inner/outer), each 12 canonical slots.
  const ringByKey = useMemo(() => {
    const map: Record<string, Ring> = {}
    for (const f of INNER_GROUPS) {
      const { inner, outer } = innerGroupRings(f, nodes)
      map[`${f}:inner`] = inner
      map[`${f}:outer`] = outer
    }
    return map
  }, [nodes])

  // Which ring key + direction a move affects. Inner group -> its inner ring;
  // outer group -> its opposite inner group's outer ring.
  const ringKeyForMove = (
    move: string,
  ): { key: string; dir: number; quarters: number } => {
    const face = move[0] as Face
    const isInner = INNER_GROUPS.includes(face)
    const ownerFace = isInner ? face : OPPOSITE_FACE[face]
    const band = isInner ? 'inner' : 'outer'
    const prime = move.includes("'")
    // Inner group (U/R/F): base = clockwise (+), prime = counter-clockwise (-).
    // Outer group (D/L/B): direction is INVERTED — a base move rotates the
    // opposite's OUTER ring counter-clockwise, and prime rotates it clockwise.
    let dir = prime ? -1 : 1
    if (!isInner) dir = -dir
    const quarters = move.includes('2') ? 2 : 1
    return { key: `${ownerFace}:${band}`, dir, quarters }
  }

  // Derive each sticker's render position by REPLAYING the move history.
  //
  // Positions (screen coords) are the stable entities; stickers flow between
  // them. `occupantAt[posIdx]` = the facelet id currently shown at that slot.
  // Rings share positions (a sticker can belong to several rings), so we must
  // replay moves in order: each move cycles its ring's 12 slots by 3, carrying
  // whatever sticker currently sits there. A per-ring offset would be wrong
  // because shared stickers would be double-counted.
  const { renderPos } = useMemo(() => {
    // Stable position list: each node's home (x,y) is one position, indexed by
    // faceletIndex (unique). posOf[id] = home coordinate of that slot.
    const posOf: Record<number, XY> = {}
    for (const n of nodes) posOf[n.faceletIndex] = { x: n.x, y: n.y }

    // occupant[slotId] = faceletId currently displayed at that slot. Start = identity.
    const occupant: Record<number, number> = {}
    for (const n of nodes) occupant[n.faceletIndex] = n.faceletIndex

    // Each ring is an ordered list of 12 slot ids (faceletIndex of the slot).
    const ringSlotIds: Record<string, number[]> = {}
    for (const key of RING_KEYS) {
      const ring = ringByKey[key]
      ringSlotIds[key] = ring ? ring.slots.map((s) => s.faceletIndex) : []
    }

    // Rotate one ring by `steps` slots (positive = clockwise/+). Moves the
    // occupant currently at slot i to slot (i+steps) mod 12.
    const rotate = (key: string, steps: number) => {
      const slotIds = ringSlotIds[key]
      const n = slotIds.length
      if (n !== 12) return
      const shift = ((steps % n) + n) % n
      if (shift === 0) return
      const current = slotIds.map((sid) => occupant[sid])
      for (let i = 0; i < n; i++) {
        occupant[slotIds[(i + shift) % n]] = current[i]
      }
    }

    // Replay history in order.
    for (const move of history) {
      const { key, dir, quarters } = ringKeyForMove(move)
      rotate(key, dir * quarters * RING_QUARTER_STEP)
    }

    // Render position for each sticker = the position of the slot it occupies.
    // occupant[slotId] = stickerId  =>  sticker `stickerId` renders at posOf[slotId].
    const renderPos: Record<number, XY> = { ...posOf }
    for (const slotId of Object.keys(occupant).map(Number)) {
      const stickerId = occupant[slotId]
      renderPos[stickerId] = posOf[slotId]
    }
    return { renderPos }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, ringByKey, nodes])

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
