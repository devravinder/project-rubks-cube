import { useMemo, useRef } from 'react'
import { useCubeStore } from '../store/cubeStore'
import { FACE_COLOR, type Face } from '../cube/facelet'
import type { MoveName } from '../cube/moves'
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

  // For each ring, the center (pivot) and the set of slot facelet-ids on it.
  const ringInfo = useMemo(() => {
    const info: Record<string, { center: [number, number]; ids: Set<number> }> = {}
    for (const key of RING_KEYS) {
      const ring = ringByKey[key]
      if (!ring) continue
      info[key] = {
        center: ring.center,
        ids: new Set(ring.slots.map((s) => s.faceletIndex)),
      }
    }
    return info
  }, [ringByKey])

  // Reverse map: given the ring that was dragged and the visual sweep direction
  // (cw = clockwise), return the move to apply.
  //
  // Inner rings are owned by U/R/F: cw => base move, ccw => prime.
  // Outer rings are driven by the OPPOSITE outer face (D/L/B) with INVERTED
  // direction (matches the display model): on an outer ring, cw => prime of the
  // driver, ccw => base of the driver.
  const RING_OWNER: Record<string, { inner: Face; outer: Face }> = {
    'U:inner': { inner: 'U', outer: 'D' },
    'U:outer': { inner: 'U', outer: 'D' },
    'R:inner': { inner: 'R', outer: 'L' },
    'R:outer': { inner: 'R', outer: 'L' },
    'F:inner': { inner: 'F', outer: 'B' },
    'F:outer': { inner: 'F', outer: 'B' },
  }

  const moveForDrag = (key: string, cw: boolean): MoveName | null => {
    const owner = RING_OWNER[key]
    if (!owner) return null
    if (key.endsWith(':inner')) {
      // Owned by inner face: cw => base, ccw => prime.
      return (cw ? owner.inner : `${owner.inner}'`) as MoveName
    }
    // Outer ring: driven by the outer face with inverted direction.
    // cw => prime of driver, ccw => base of driver.
    return (cw ? `${owner.outer}'` : owner.outer) as MoveName
  }

  // Minimum sweep (degrees) around a ring center to commit a move.
  const COMMIT_ANGLE_DEG = 20

  const drag = useRef<{
    node: NodePos
    startX: number
    startY: number
    committed: boolean
  } | null>(null)

  // Convert a client point to SVG viewBox coordinates.
  const toSvg = (svg: SVGSVGElement, clientX: number, clientY: number): XY => {
    const rect = svg.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * LAYOUT_VIEWBOX.size,
      y: ((clientY - rect.top) / rect.height) * LAYOUT_VIEWBOX.size,
    }
  }

  const onPointerDown = (node: NodePos) => (e: React.PointerEvent) => {
    drag.current = { node, startX: e.clientX, startY: e.clientY, committed: false }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.committed) return

    const svg = e.currentTarget as SVGSVGElement
    const start = toSvg(svg, d.startX, d.startY)
    const cur = toSvg(svg, e.clientX, e.clientY)

    // Candidate rings that contain the grabbed sticker.
    const candidates = RING_KEYS.filter(
      (k) => ringInfo[k]?.ids.has(d.node.faceletIndex),
    )
    if (candidates.length === 0) return

    // Choose the ring the user is tracing: the one whose center the grabbed
    // sticker orbits and where the drag produces the largest clean sweep.
    let best: { key: string; sweep: number } | null = null
    for (const key of candidates) {
      const [cx, cy] = ringInfo[key].center
      const a0 = Math.atan2(start.y - cy, start.x - cx)
      const a1 = Math.atan2(cur.y - cy, cur.x - cx)
      let sweep = ((a1 - a0) * 180) / Math.PI
      while (sweep > 180) sweep -= 360
      while (sweep <= -180) sweep += 360
      if (!best || Math.abs(sweep) > Math.abs(best.sweep)) best = { key, sweep }
    }
    if (!best) return

    if (Math.abs(best.sweep) >= COMMIT_ANGLE_DEG) {
      const cw = best.sweep > 0 // SVG y-down: positive sweep = clockwise
      const move = moveForDrag(best.key, cw)
      d.committed = true
      drag.current = null
      if (move) applyMove(move)
    }
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
