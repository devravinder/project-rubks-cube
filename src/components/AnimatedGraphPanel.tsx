import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Circle, Group, Text } from 'react-konva'
import type Konva from 'konva'
import { FACE_COLOR, type Face } from '../cube/facelet'
import type { MoveName } from '../cube/moves'
import { useCubeStore } from '../store/cubeStore'

/**
 * AnimatedGraphPanel — a react-konva mandala that mirrors the cube and animates
 * each move by spinning the turned face's own cluster AND its inner circle.
 *
 * SYNC MODEL (cannot desync from 3D): sticker POSITIONS are fixed; each
 * sticker's COLOR is read from the store `state[faceletIndex]`. On every move,
 * we play a transient spin of the affected groups; the colors themselves come
 * straight from the authoritative cube state.
 */

// ---- Layout data (same mandala as the SVG 2D view) ----
const VIEW = 100
// Sticker radius. With the widened ring spacing, adjacent dots are ~6.78 units
// apart, so anything up to ~3.39 stays non-overlapping. 3.0 desktop / 3.2 mobile
// makes the stickers noticeably larger while keeping a clear gap.
const NODE_R = 3.0
// Fraction of the panel the mandala fills (< 1 leaves margin, matching the 3D
// cube's framing so both panels look similarly sized).
const FILL_FACTOR = 0.78

type NodePos = { faceletIndex: number; x: number; y: number; face: Face; label?: string }
// Guide-ring spacing widened from 5.4 → 6.5 (radii 23.2 / 29.7 / 36.2). This
// PULLS the inner ring in and pushes the outer out just enough to grow the
// smallest dot-to-dot gap from 5.72 → ~6.78, so stickers can be drawn larger
// (up to r≈3.39) WITHOUT overlapping. Coords are circle-circle intersections of
// the new radii, preserving the mandala interlock and clean rotation arcs.
const NODES: NodePos[] = [
  { faceletIndex: 0, face: 'U', x: 50, y: 46.75 }, { faceletIndex: 1, face: 'U', x: 55.79, y: 43.21 }, { faceletIndex: 2, face: 'U', x: 63, y: 41.44 },
  { faceletIndex: 3, face: 'U', x: 44.21, y: 43.21 }, { faceletIndex: 4, face: 'U', x: 50, y: 38.85, label: 'U' }, { faceletIndex: 5, face: 'U', x: 57.21, y: 35.87 },
  { faceletIndex: 6, face: 'U', x: 37, y: 41.44 }, { faceletIndex: 7, face: 'U', x: 42.79, y: 35.87 }, { faceletIndex: 8, face: 'U', x: 50, y: 31.56 },
  { faceletIndex: 9, face: 'R', x: 58.01, y: 60.62 }, { faceletIndex: 10, face: 'R', x: 58.18, y: 67.4 }, { faceletIndex: 11, face: 'R', x: 56.1, y: 74.53 },
  { faceletIndex: 12, face: 'R', x: 63.97, y: 57.38 }, { faceletIndex: 13, face: 'R', x: 64.85, y: 64.57, label: 'R' }, { faceletIndex: 14, face: 'R', x: 63.82, y: 72.31 },
  { faceletIndex: 15, face: 'R', x: 69.1, y: 52.01 }, { faceletIndex: 16, face: 'R', x: 71.04, y: 59.82 }, { faceletIndex: 17, face: 'R', x: 71.17, y: 68.22 },
  { faceletIndex: 18, face: 'F', x: 41.99, y: 60.62 }, { faceletIndex: 19, face: 'F', x: 36.03, y: 57.38 }, { faceletIndex: 20, face: 'F', x: 30.9, y: 52.01 },
  { faceletIndex: 21, face: 'F', x: 41.82, y: 67.4 }, { faceletIndex: 22, face: 'F', x: 35.15, y: 64.57, label: 'F' }, { faceletIndex: 23, face: 'F', x: 28.96, y: 59.82 },
  { faceletIndex: 24, face: 'F', x: 43.9, y: 74.53 }, { faceletIndex: 25, face: 'F', x: 36.18, y: 72.31 }, { faceletIndex: 26, face: 'F', x: 28.83, y: 68.22 },
  { faceletIndex: 27, face: 'D', x: 50, y: 82.39 }, { faceletIndex: 28, face: 'D', x: 44.21, y: 85.93 }, { faceletIndex: 29, face: 'D', x: 37, y: 87.7 },
  { faceletIndex: 30, face: 'D', x: 55.79, y: 85.93 }, { faceletIndex: 31, face: 'D', x: 50, y: 90.29, label: 'D' }, { faceletIndex: 32, face: 'D', x: 42.79, y: 93.27 },
  { faceletIndex: 33, face: 'D', x: 63, y: 87.7 }, { faceletIndex: 34, face: 'D', x: 57.21, y: 93.27 }, { faceletIndex: 35, face: 'D', x: 50, y: 97.58 },
  { faceletIndex: 36, face: 'L', x: 27.14, y: 42.8 }, { faceletIndex: 37, face: 'L', x: 26.97, y: 36.02 }, { faceletIndex: 38, face: 'L', x: 29.05, y: 28.89 },
  { faceletIndex: 39, face: 'L', x: 21.18, y: 46.04 }, { faceletIndex: 40, face: 'L', x: 20.3, y: 38.85, label: 'L' }, { faceletIndex: 41, face: 'L', x: 21.33, y: 31.11 },
  { faceletIndex: 42, face: 'L', x: 16.05, y: 51.41 }, { faceletIndex: 43, face: 'L', x: 14.11, y: 43.6 }, { faceletIndex: 44, face: 'L', x: 13.98, y: 35.2 },
  { faceletIndex: 45, face: 'B', x: 72.86, y: 42.8 }, { faceletIndex: 46, face: 'B', x: 78.82, y: 46.04 }, { faceletIndex: 47, face: 'B', x: 83.95, y: 51.41 },
  { faceletIndex: 48, face: 'B', x: 73.03, y: 36.02 }, { faceletIndex: 49, face: 'B', x: 79.7, y: 38.85, label: 'B' }, { faceletIndex: 50, face: 'B', x: 85.89, y: 43.6 },
  { faceletIndex: 51, face: 'B', x: 70.95, y: 28.89 }, { faceletIndex: 52, face: 'B', x: 78.67, y: 31.11 }, { faceletIndex: 53, face: 'B', x: 86.02, y: 35.2 },
]

// Guide circles (3 groups × 3 radii). Spacing widened to 6.5 (23.2/29.7/36.2)
// so stickers sit farther apart and can be drawn larger without overlap.
const GUIDE_CIRCLES = [
  { cx: 50, cy: 38.85, r: 23.2 }, { cx: 50, cy: 38.85, r: 29.7 }, { cx: 50, cy: 38.85, r: 36.2 },
  { cx: 64.85, cy: 64.57, r: 23.2 }, { cx: 64.85, cy: 64.57, r: 29.7 }, { cx: 64.85, cy: 64.57, r: 36.2 },
  { cx: 35.15, cy: 64.57, r: 23.2 }, { cx: 35.15, cy: 64.57, r: 29.7 }, { cx: 35.15, cy: 64.57, r: 36.2 },
]

// Inner-circle sticker sets per face (the ring that spins on that face's move),
// plus each face's own 8 outer stickers (the cluster) and the pivot centers.
const FACE_CLUSTER: Record<Face, number[]> = {
  U: [8, 5, 2, 1, 0, 3, 6, 7],
  D: [29, 28, 27, 30, 33, 34, 35, 32],
  R: [17, 14, 11, 10, 9, 12, 15, 16],
  L: [36, 39, 42, 43, 44, 41, 38, 37],
  F: [26, 23, 20, 19, 18, 21, 24, 25],
  B: [47, 46, 45, 48, 51, 52, 53, 50],
}
const FACE_INNER: Record<Face, number[]> = {
  U: [51, 48, 45, 15, 12, 9, 18, 19, 20, 36, 37, 38],
  D: [26, 25, 24, 11, 14, 17, 47, 50, 53, 44, 43, 42],
  R: [33, 30, 27, 24, 21, 18, 0, 1, 2, 45, 46, 47],
  L: [20, 23, 26, 29, 32, 35, 53, 52, 51, 8, 7, 6],
  F: [42, 39, 36, 6, 3, 0, 9, 10, 11, 27, 28, 29],
  B: [17, 16, 15, 2, 5, 8, 38, 41, 44, 35, 34, 33],
}
// Cluster center = the labelled centre sticker of each face.
const FACE_CENTER: Record<Face, { x: number; y: number }> = {
  U: { x: 50, y: 38.85 }, R: { x: 64.85, y: 64.57 }, F: { x: 35.15, y: 64.57 },
  D: { x: 50, y: 90.29 }, L: { x: 20.3, y: 38.85 }, B: { x: 79.7, y: 38.85 },
}
// Inner-circle pivot = the group circle centre.
const GROUP_CENTER: Record<Face, { x: number; y: number }> = {
  U: { x: 50, y: 38.85 }, D: { x: 50, y: 38.85 },
  R: { x: 64.85, y: 64.57 }, L: { x: 64.85, y: 64.57 },
  F: { x: 35.15, y: 64.57 }, B: { x: 35.15, y: 64.57 },
}

const posOf: Record<number, { x: number; y: number }> = {}
for (const n of NODES) posOf[n.faceletIndex] = { x: n.x, y: n.y }

// The 3 group circle centres (pivots for ring rotation). The MIDDLE ring is
// static; only inner/outer rings trigger, via the EDGE_TRACK map below.

/**
 * EDGE-MIDDLE sticker → the ONE trackable ring it drives.
 * Each face's 4 edge-middle stickers (locals 1,3,5,7) lie on a static MIDDLE
 * ring + exactly one INNER/OUTER ring. Dragging that sticker rotates that ring.
 * `invert` marks outer rings (their face turns opposite the drag direction).
 * Built from the mandala geometry (verified against the reference).
 */
type EdgeTrack = { cx: number; cy: number; move: Face; invert: boolean }
const EDGE_TRACK: Record<number, EdgeTrack> = {
  // U
  1: { cx: 64.85, cy: 64.57, move: 'R', invert: false },
  3: { cx: 35.15, cy: 64.57, move: 'F', invert: false },
  5: { cx: 35.15, cy: 64.57, move: 'B', invert: true },
  7: { cx: 64.85, cy: 64.57, move: 'L', invert: true },
  // R
  10: { cx: 35.15, cy: 64.57, move: 'F', invert: false },
  12: { cx: 50, cy: 38.85, move: 'U', invert: false },
  14: { cx: 50, cy: 38.85, move: 'D', invert: true },
  16: { cx: 35.15, cy: 64.57, move: 'B', invert: true },
  // F
  19: { cx: 50, cy: 38.85, move: 'U', invert: false },
  21: { cx: 64.85, cy: 64.57, move: 'R', invert: false },
  23: { cx: 64.85, cy: 64.57, move: 'L', invert: true },
  25: { cx: 50, cy: 38.85, move: 'D', invert: true },
  // D
  28: { cx: 35.15, cy: 64.57, move: 'F', invert: false },
  30: { cx: 64.85, cy: 64.57, move: 'R', invert: false },
  32: { cx: 64.85, cy: 64.57, move: 'L', invert: true },
  34: { cx: 35.15, cy: 64.57, move: 'B', invert: true },
  // L
  37: { cx: 50, cy: 38.85, move: 'U', invert: false },
  39: { cx: 35.15, cy: 64.57, move: 'F', invert: false },
  41: { cx: 35.15, cy: 64.57, move: 'B', invert: true },
  43: { cx: 50, cy: 38.85, move: 'D', invert: true },
  // B
  46: { cx: 64.85, cy: 64.57, move: 'R', invert: false },
  48: { cx: 50, cy: 38.85, move: 'U', invert: false },
  50: { cx: 50, cy: 38.85, move: 'D', invert: true },
  52: { cx: 64.85, cy: 64.57, move: 'L', invert: true },
}

// faceletIndex → face label (only the centre stickers carry a label).
const labelOf: Record<number, string> = {}
for (const n of NODES) if (n.label) labelOf[n.faceletIndex] = n.label

const ANIM_MS = 300

// Shift amounts (array positions) for one quarter turn — matches the 2D logic:
//  - face cluster (8 perimeter stickers): shift by 2
//  - inner ring (12 stickers, 4 arcs of 3): shift by 3
const FACE_SHIFT = 2
const INNER_SHIFT = 3

/** angle of point (x,y) around pivot (px,py). */
function angleOf(x: number, y: number, px: number, py: number) {
  return Math.atan2(y - py, x - px)
}
/** shortest signed angular delta a→b. */
function angDelta(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

/** A dot flying along an arc from one slot to another during a move. */
type FlyingDot = {
  color: Face
  label: number // faceletIndex it represents (for debug text)
  px: number
  py: number // pivot
  r: number // radius (constant along the arc)
  a0: number // start angle
  da: number // signed angular delta to travel
}

// ---- Color model (matches the SVG 2D exactly) ----
// Colors are permuted among the FIXED slot positions by the same FACE + INNER
// shift logic the SVG panel uses (NOT read from cube state[faceletIndex], whose
// facelet→position convention differs). Initial color of a slot = its home face.
const HOME_FACE: Face[] = NODES.slice()
  .sort((a, b) => a.faceletIndex - b.faceletIndex)
  .map((n) => n.face)

/** Shift an array's values by `amount` positions, writing into a color array. */
function shiftColors(colors: Face[], arr: number[], amount: number) {
  const n = arr.length
  const snapshot = arr.map((slot) => colors[slot])
  arr.forEach((slot, i) => {
    colors[slot] = snapshot[((i - amount) % n + n) % n]
  })
}

/** Apply one move's color permutation (face cluster shift 2 + inner ring shift 3). */
function applyMoveToColors(move: string, colors: Face[]): Face[] {
  const face = move[0] as Face
  const prime = move.includes("'")
  const isDouble = move.includes('2')
  const turns = isDouble ? 2 : 1
  const faceStep = prime ? -FACE_SHIFT : FACE_SHIFT
  const innerStep = prime ? -INNER_SHIFT : INNER_SHIFT
  for (let t = 0; t < turns; t++) {
    shiftColors(colors, FACE_CLUSTER[face], faceStep)
    shiftColors(colors, FACE_INNER[face], innerStep)
  }
  return colors
}

/** Replay the whole history from home colors → current displayed colors. */
function colorsFromHistory(history: string[]): Face[] {
  const colors = HOME_FACE.slice()
  for (const m of history) applyMoveToColors(m, colors)
  return colors
}

export function AnimatedGraphPanel() {
  const lastMove = useCubeStore((s) => s.lastMove)
  const debug = useCubeStore((s) => s.debug)
  const history = useCubeStore((s) => s.history)
  const applyMove = useCubeStore((s) => s.applyMove)

  // Drag-to-rotate along a RING track. On press, we detect which group's inner
  // or outer ring the pointer is on (middle ring = static, ignored). Sweeping
  // around that group's centre commits the mapped move on release. This ONLY
  // calls applyMove — the store drives 3D + the 2D animation.
  const dragRef = useRef<{
    cx: number
    cy: number
    move: MoveName
    invert: boolean
    startAng: number
    sweep: number
  } | null>(null)
  const DRAG_COMMIT_DEG = 0.1

  // Displayed color at each slot — derived from the SVG-2D permutation model.
  const [colors, setColors] = useState<Face[]>(() => colorsFromHistory(history))

  // Active animation: the flying dots + which slots are hidden (being animated),
  // plus a progress value 0..1.
  const [flying, setFlying] = useState<FlyingDot[] | null>(null)
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const [t, setT] = useState(0)
  const rafRef = useRef<number>(0)

  // Responsive stage size.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(320)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const s = Math.min(el.clientWidth, el.clientHeight)
      if (s > 0) setSize(s)
      setIsMobile(window.innerWidth < 1024) // lg breakpoint = stacked layout
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Responsive sizing: on mobile the whole mandala fills more of the panel
  // (bigger overall) AND stickers are drawn a bit larger for easier tapping.
  // A larger grab radius makes rings easy to grab on touch. (Adjacent dots are
  // ~5.72 units apart, so keep the drawn radius under ~2.86 to avoid overlap.)
  // Responsive sizing: on mobile the whole mandala fills more of the panel
  // (bigger overall) AND stickers are drawn larger for easy touch dragging.
  // With the widened ring spacing, dots are ~6.78 units apart, so keep the drawn
  // radius under ~3.39 to avoid overlap. Grab radius (invisible tap target) is
  // large so rings stay easy to grab.
  const fillFactor = isMobile ? 1.0 : FILL_FACTOR
  const nodeR = isMobile ? 3.2 : NODE_R
  const grabR = isMobile ? 9 : 6
  // Keep the current grab radius readable inside the (stable) pointer listener.
  const grabRef = useRef(grabR)
  grabRef.current = grabR

  const scale = (size * fillFactor) / VIEW
  // Offset to center the scaled 100-unit content within the square stage.
  const offset = (size - VIEW * scale) / 2

  // Stage ref — used to attach native pointer listeners on its DOM container,
  // which gives a reliable drag lifecycle (Konva's per-node/stage pointer events
  // don't track a drag once the pointer leaves the shape).
  const stageRef = useRef<Konva.Stage>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const container = stage.container()

    // Pointer → 100-unit viewBox coords (accounts for scale + centering offset).
    const toView = () => {
      const p = stage.getRelativePointerPosition()
      return p ? { x: p.x, y: p.y } : null
    }

    const onDown = (ev: PointerEvent) => {
      const pt = toView()
      if (!pt) return
      // Find the nearest EDGE-MIDDLE sticker to the press (only those trigger).
      let id = -1
      let bestD = grabRef.current // grab radius around the sticker (viewBox units)
      for (const key of Object.keys(EDGE_TRACK)) {
        const fi = Number(key)
        const p = posOf[fi]
        const d = Math.hypot(pt.x - p.x, pt.y - p.y)
        if (d < bestD) { bestD = d; id = fi }
      }
      if (id < 0) {
        console.log('[drag] DOWN miss (not near an edge-middle sticker)', pt)
        return
      }
      const track = EDGE_TRACK[id]
      dragRef.current = {
        cx: track.cx,
        cy: track.cy,
        move: track.move,
        invert: track.invert,
        startAng: Math.atan2(pt.y - track.cy, pt.x - track.cx),
        sweep: 0,
      }
      container.setPointerCapture?.(ev.pointerId)
      console.log('[drag] DOWN sticker', id, '→', track.move, track.invert ? "'" : "")
    }
    const onMove = () => {
      const d = dragRef.current
      if (!d) return
      const pt = toView()
      if (!pt) return
      let sweep = ((Math.atan2(pt.y - d.cy, pt.x - d.cx) - d.startAng) * 180) / Math.PI
      while (sweep > 180) sweep -= 360
      while (sweep <= -180) sweep += 360
      d.sweep = sweep
    }
    const onUp = (ev: PointerEvent) => {
      const d = dragRef.current
      dragRef.current = null
      container.releasePointerCapture?.(ev.pointerId)
      if (!d) return
      if (Math.abs(d.sweep) < DRAG_COMMIT_DEG) return
      let clockwise = d.sweep > 0
      if (d.invert) clockwise = !clockwise // outer ring inverts direction
      const move = (clockwise ? d.move : `${d.move}'`) as MoveName
      console.log('[drag] TRIGGER', move)
      applyMove(move)
    }

    container.style.touchAction = 'none'
    container.addEventListener('pointerdown', onDown)
    container.addEventListener('pointermove', onMove)
    container.addEventListener('pointerup', onUp)
    container.addEventListener('pointercancel', onUp)
    return () => {
      container.removeEventListener('pointerdown', onDown)
      container.removeEventListener('pointermove', onMove)
      container.removeEventListener('pointerup', onUp)
      container.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyMove])

  // Keep displayed colors in sync (idle) with the history-replay permutation.
  useEffect(() => {
    if (!flying) setColors(colorsFromHistory(history))
  }, [history, flying])

  // Trigger an arc animation on each single move (history grows by 1).
  const prevLen = useRef(history.length)
  useEffect(() => {
    const grew = history.length === prevLen.current + 1
    const shrunkOrJumped = history.length !== prevLen.current + 1
    prevLen.current = history.length
    if (!grew || !lastMove) {
      // Non-single-move change (scramble/undo/reset): snap colors, no animation.
      if (shrunkOrJumped) {
        setFlying(null)
        setHidden(new Set())
        setColors(colorsFromHistory(history))
      }
      return
    }

    const face = lastMove[0] as Face
    const prime = lastMove.includes("'")
    const isDouble = lastMove.includes('2')
    if (isDouble) {
      // Keep it simple: double turns snap (no arc animation).
      setColors(colorsFromHistory(history))
      return
    }

    // Colors BEFORE this move = current displayed colors (pre-state-update snapshot).
    // Note: `state` is already the post-move state, but `colors` still holds the
    // pre-move colors until we finish, so we animate the OLD colors travelling.
    const before = colors

    const buildDots = (
      arr: number[],
      shift: number,
      pivot: { x: number; y: number },
    ): FlyingDot[] => {
      const n = arr.length
      const step = prime ? -shift : shift
      return arr.map((slot, i) => {
        // The color currently at `srcSlot` travels to `slot`.
        const srcSlot = arr[((i - step) % n + n) % n]
        const src = posOf[srcSlot]
        const dst = posOf[slot]
        const a0 = angleOf(src.x, src.y, pivot.x, pivot.y)
        const a1 = angleOf(dst.x, dst.y, pivot.x, pivot.y)
        const r = Math.hypot(src.x - pivot.x, src.y - pivot.y)
        return {
          color: before[srcSlot],
          label: srcSlot,
          px: pivot.x,
          py: pivot.y,
          r,
          a0,
          da: angDelta(a0, a1),
        }
      })
    }

    const faceDots = buildDots(FACE_CLUSTER[face], FACE_SHIFT, FACE_CENTER[face])
    const innerDots = buildDots(FACE_INNER[face], INNER_SHIFT, GROUP_CENTER[face])
    const dots = [...faceDots, ...innerDots]

    // Hide the underlying slots being animated (both source & target slots) so
    // only the flying dots are visible during the tween.
    const hideSet = new Set<number>()
    for (const id of FACE_CLUSTER[face]) hideSet.add(id)
    for (const id of FACE_INNER[face]) hideSet.add(id)

    setColors(before) // hold pre-move colors on static slots during the tween
    setHidden(hideSet)
    setFlying(dots)
    setT(0)

    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ANIM_MS)
      setT(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Settle: colors from the history-replay permutation, clear animation.
        setFlying(null)
        setHidden(new Set())
        setColors(colorsFromHistory(history))
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length, lastMove])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return (
    <div ref={wrapRef} className="flex h-full w-full items-center justify-center bg-card">
      <Stage
        ref={stageRef}
        width={size}
        height={size}
        scaleX={scale}
        scaleY={scale}
        x={offset}
        y={offset}
      >
        <Layer>
          {/* Guide circles. */}
          {GUIDE_CIRCLES.map((c, i) => (
            <Circle key={i} x={c.cx} y={c.cy} radius={c.r} stroke="rgba(150,150,150,0.5)" strokeWidth={0.5} />
          ))}

          {/* Static slots (not currently animating). */}
          {NODES.filter((n) => !hidden.has(n.faceletIndex)).map((n) => (
            <Group key={n.faceletIndex}>
              <Circle
                x={n.x}
                y={n.y}
                radius={nodeR}
                fill={FACE_COLOR[colors[n.faceletIndex]]}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={0.25}
              />
              <Text
                x={n.x - 3}
                y={n.y - 1.4}
                width={6}
                align="center"
                text={debug ? String(n.faceletIndex) : (labelOf[n.faceletIndex] ?? '')}
                fontSize={2.6}
                fontStyle="bold"
                fill="rgba(0,0,0,0.75)"
              />
            </Group>
          ))}

          {/* Flying dots travelling along their arcs. */}
          {flying?.map((d, i) => {
            const ang = d.a0 + d.da * t
            const x = d.px + Math.cos(ang) * d.r
            const y = d.py + Math.sin(ang) * d.r
            return (
              <Group key={`fly-${i}`}>
                <Circle x={x} y={y} radius={nodeR} fill={FACE_COLOR[d.color]} stroke="rgba(0,0,0,0.4)" strokeWidth={0.25} />
                <Text
                  x={x - 3}
                  y={y - 1.4}
                  width={6}
                  align="center"
                  text={debug ? String(d.label) : (labelOf[d.label] ?? '')}
                  fontSize={2.6}
                  fontStyle="bold"
                  fill="rgba(0,0,0,0.75)"
                />
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}

export default AnimatedGraphPanel

