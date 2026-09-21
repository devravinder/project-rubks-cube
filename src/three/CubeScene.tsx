import { useEffect, useRef } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import { Cube3D, type Cube3DHandle } from './Cube3D'
import { resolveTurn } from './turnLogic'
import type { Vec3 } from './geometry'

const DRAG_THRESHOLD = 8

/** Minimal shape of the OrbitControls instance we touch (avoids a hard type dep). */
type OrbitLike = { enabled: boolean }

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
}: {
  cubeRef: React.RefObject<Cube3DHandle | null>
  orbitRef: React.RefObject<OrbitLike | null>
}) {
  const { camera, gl } = useThree()
  const pointer = useRef<PointerState | null>(null)

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
export function CubeScene() {
  const cubeRef = useRef<Cube3DHandle | null>(null)
  const orbitRef = useRef<OrbitLike | null>(null)

  return (
    <Canvas
      camera={{ position: [4, 4, 5.5], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 6]} intensity={1.1} />
      <directionalLight position={[-6, -3, -4]} intensity={0.35} />

      <Interaction cubeRef={cubeRef} orbitRef={orbitRef} />

      <OrbitControls
        ref={orbitRef as never}
        enablePan={false}
        enableZoom
        minDistance={4}
        maxDistance={12}
        rotateSpeed={0.9}
      />
    </Canvas>
  )
}
