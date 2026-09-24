import { useEffect, useRef } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import { Cube3D, type Cube3DHandle } from './Cube3D'
import { resolveTurn } from './turnLogic'
import { AxisGizmo } from './AxisGizmo'
import {
  loadCameraPose,
  saveCameraPose,
  clearCameraPose,
  DEFAULT_CAMERA_POSE,
} from './cameraPersistence'
import type { Vec3 } from './geometry'

const DRAG_THRESHOLD = 8

/** Minimal shape of the OrbitControls instance we touch (avoids a hard type dep). */
type OrbitLike = {
  enabled: boolean
  object?: {
    position: { set: (x: number, y: number, z: number) => void; toArray: () => number[]; copy: (v: unknown) => void; lookAt: (x: number, y: number, z: number) => void }
  }
  target?: { set: (x: number, y: number, z: number) => void; toArray: () => number[] }
  update?: () => void
  addEventListener?: (type: string, cb: () => void) => void
  removeEventListener?: (type: string, cb: () => void) => void
}

type PointerState = {
  startX: number
  startY: number
  cubie: Vec3
  normal: Vec3
  isCorner: boolean
}

/**
 * Lives inside the Canvas so it can use the camera. Handles gesture
 * classification: corner-drag spins the whole cube (OrbitControls stays on);
 * dragging a non-corner sticker turns that layer.
 */
function Interaction({
  cubeRef,
  orbitRef,
  onReady,
}: {
  cubeRef: React.RefObject<Cube3DHandle | null>
  orbitRef: React.RefObject<OrbitLike | null>
  onReady?: (resetCamera: () => void) => void
}) {
  const { camera, gl } = useThree()
  const pointer = useRef<PointerState | null>(null)

  // On mount, restore the saved camera pose (or the default view if none).
  useEffect(() => {
    let raf = 0
    const apply = () => {
      const controls: any = orbitRef.current
      if (!controls?.object) {
        // OrbitControls may not be attached yet on the first tick; retry.
        raf = requestAnimationFrame(apply)
        return
      }
      const pose = loadCameraPose() ?? DEFAULT_CAMERA_POSE
      controls.object.position.set(...pose.position)
      controls.target?.set(...pose.target)
      controls.object.lookAt(pose.target[0], pose.target[1], pose.target[2])
      controls.update?.()
    }
    apply()
    return () => cancelAnimationFrame(raf)
  }, [camera, orbitRef])

  // Save the camera pose whenever the user finishes orbiting/zooming.
  useEffect(() => {
    let raf = 0
    let attached: OrbitLike | null = null
    const onEnd = () => {
      const controls = orbitRef.current
      const obj = controls?.object
      const tgt = controls?.target
      if (!obj || !tgt) return
      const p = obj.position.toArray()
      const t = tgt.toArray()
      saveCameraPose({
        position: [p[0], p[1], p[2]],
        target: [t[0], t[1], t[2]],
      })
    }
    const attach = () => {
      const controls = orbitRef.current
      if (!controls?.addEventListener) {
        raf = requestAnimationFrame(attach)
        return
      }
      controls.addEventListener('end', onEnd)
      attached = controls
    }
    attach()
    return () => {
      cancelAnimationFrame(raf)
      attached?.removeEventListener?.('end', onEnd)
    }
  }, [orbitRef])

  // Expose a resetCamera function to restore the default view
  useEffect(() => {
    if (!onReady) return
    const resetCamera = () => {
      const controls: any = orbitRef.current
      if (controls?.object) {
        controls.object.position.set(...DEFAULT_CAMERA_POSE.position)
        controls.target?.set(...DEFAULT_CAMERA_POSE.target)
        controls.object.lookAt(
          DEFAULT_CAMERA_POSE.target[0],
          DEFAULT_CAMERA_POSE.target[1],
          DEFAULT_CAMERA_POSE.target[2],
        )
        controls.update?.()
        // Clearing the saved pose means a refresh after reset keeps the default.
        clearCameraPose()
      }
    }
    onReady(resetCamera)
  }, [onReady, orbitRef])

  const screenDeltaToWorld = (dx: number, dy: number, normal: Vec3): Vec3 => {
    const right = new Vector3()
    const up = new Vector3()
    camera.matrixWorld.extractBasis(right, up, new Vector3())
    const worldDrag = new Vector3()
      .addScaledVector(right, dx)
      .addScaledVector(up, -dy)
    const n = new Vector3(...normal).normalize()
    worldDrag.addScaledVector(n, -worldDrag.dot(n))
    if (worldDrag.lengthSq() < 1e-6) return [0, 0, 0]
    worldDrag.normalize()
    return [worldDrag.x, worldDrag.y, worldDrag.z]
  }

  // Attach the sticker pointer-down handler to the window for move/up tracking.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pointer.current
      if (!p || p.isCorner) return
      const dx = e.clientX - p.startX
      const dy = e.clientY - p.startY
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return

      const dragDir = screenDeltaToWorld(dx, dy, p.normal)
      const turn = resolveTurn(p.cubie, p.normal, dragDir)
      pointer.current = null
      if (orbitRef.current) orbitRef.current.enabled = true
      if (turn && cubeRef.current && !cubeRef.current.isAnimating()) {
        cubeRef.current.startTurn(turn)
      }
    }
    const onUp = () => {
      if (orbitRef.current) orbitRef.current.enabled = true
      pointer.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [camera, cubeRef, orbitRef])

  gl.domElement.style.touchAction = 'none'

  // Expose the pointer-down handler via a ref-like closure on the cube stickers.
  const onStickerPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const ud = e.object.userData as { cubie?: Vec3; normal?: Vec3 }
    if (!ud.cubie || !ud.normal) return
    const isCorner = ud.cubie.every((c) => c !== 0)
    pointer.current = {
      startX: e.nativeEvent.clientX,
      startY: e.nativeEvent.clientY,
      cubie: ud.cubie,
      normal: ud.normal,
      isCorner,
    }
    // For a layer grab, disable orbit so the drag turns the layer instead.
    if (!isCorner && orbitRef.current) orbitRef.current.enabled = false
  }

  return <Cube3D ref={cubeRef} onStickerPointerDown={onStickerPointerDown} />
}

/** The Three.js scene: camera, lighting, the interactive cube, orbit controls. */
export function CubeScene({
  onReady,
}: {
  onReady?: (resetCamera: () => void) => void
}) {
  const cubeRef = useRef<Cube3DHandle | null>(null)
  const orbitRef = useRef<OrbitLike | null>(null)
  // Wider fov on small screens makes the cube appear smaller so it fits nicely.
  const fov = typeof window !== 'undefined' && window.innerWidth < 1024 ? 52 : 40

  return (
    <Canvas
      camera={{ position: [3.9, 3.9, 4.7], fov }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 6]} intensity={1.1} />
      <directionalLight position={[-6, -3, -4]} intensity={0.35} />

      <Interaction cubeRef={cubeRef} orbitRef={orbitRef} onReady={onReady} />

      <OrbitControls
        ref={orbitRef as never}
        enablePan={false}
        enableZoom
        minDistance={3}
        maxDistance={12}
        rotateSpeed={0.9}
        autoRotate={false}
        autoRotateSpeed={0}
      />

      <AxisGizmo />
    </Canvas>
  )
}
