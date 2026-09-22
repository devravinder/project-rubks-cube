import { useMemo, useRef } from 'react'
import { useCubeStore } from '../store/cubeStore'
import { FACE_COLOR, type Face } from '../cube/facelet'
import type { MoveName } from '../cube/moves'
import {
  buildNodeLayout,
  guideCircles,
  innerGroupRings,
  INNER_GROUPS,
  LAYOUT_VIEWBOX,
  NODE_RADIUS,
  type NodePos,
  type Ring,
} from './layout'

type XY = { x: number; y: number }

const RING_KEYS = INNER_GROUPS.flatMap((f) => [`${f}:inner`, `${f}:outer`])

/**
 * The 2D graph/mandala view. Sticker POSITIONS are fixed; each sticker's COLOR
 * is read from the live cube state (`state[faceletIndex]`), so the 2D view is a
 * faithful mirror of the 3D cube — solved cube ⇒ every cluster uniform.
 *
 * The circles are still interactive: dragging a sticker around a ring applies
 * the corresponding cube move (the ring geometry only drives gesture→move
 * detection; it no longer moves stickers on its own).
 */
export function Graph2D() {
  const applyMove = useCubeStore((s) => s.applyMove)
  const state = useCubeStore((s) => s.state)
  const nodes = useMemo(() => buildNodeLayout(), [])
  const circles = useMemo(() => guideCircles(), [])

  // Build the 6 rings (U/R/F × inner/outer) — used only for gesture detection.
  const ringByKey = useMemo(() => {
    const map: Record<string, Ring> = {}
    for (const f of INNER_GROUPS) {
      const { inner, outer } = innerGroupRings(f, nodes)
      map[`${f}:inner`] = inner
      map[`${f}:outer`] = outer
    }
    return map
  }, [nodes])

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
  //  - Inner rings owned by U/R/F: cw => base move, ccw => prime.
  //  - Outer rings driven by the OPPOSITE outer face (D/L/B) with INVERTED
  //    direction: cw => prime of the driver, ccw => base of the driver.
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
      return (cw ? owner.inner : `${owner.inner}'`) as MoveName
    }
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

    // Choose the ring the user is tracing: largest clean sweep around a center.
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

      {/* Sticker nodes at FIXED positions, colored from the live cube state so
          the 2D view faithfully mirrors the 3D cube (solved ⇒ uniform clusters). */}
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
