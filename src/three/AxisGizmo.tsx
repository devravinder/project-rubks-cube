import { useThree, useFrame, createPortal } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import {
  Scene,
  OrthographicCamera,
  Group,
  Quaternion,
  Vector3,
  Euler,
} from 'three'

/**
 * A 3D axis gizmo (sphere + X/Y/Z arrows) drawn in the top-left corner.
 *
 * It renders its own mini-scene with an orthographic camera into a small
 * viewport, on top of the main scene. The gizmo group copies the INVERSE of
 * the main camera's rotation, so the arrows reflect the current world axes as
 * seen from the main camera — i.e. it rotates in lockstep with the cube view.
 */
export function AxisGizmo({ size = 90, pad = 12 }: { size?: number; pad?: number }) {
  const { gl, scene: mainScene, camera: mainCamera, size: canvasSize } = useThree()
  const groupRef = useRef<Group>(null)

  // Dedicated scene + camera for the gizmo.
  const gizmoScene = useMemo(() => new Scene(), [])
  const gizmoCamera = useMemo(() => {
    const cam = new OrthographicCamera(-2.6, 2.6, 2.6, -2.6, 0.1, 100)
    cam.position.set(0, 0, 5)
    cam.lookAt(0, 0, 0)
    return cam
  }, [])

  useFrame(() => {
    if (groupRef.current) {
      // Align gizmo axes with the world as seen by the main camera.
      const q = new Quaternion()
      mainCamera.getWorldQuaternion(q)
      groupRef.current.quaternion.copy(q.invert())
    }

    // Render main scene normally (full canvas).
    gl.autoClear = true
    gl.setViewport(0, 0, canvasSize.width, canvasSize.height)
    gl.render(mainScene, mainCamera)

    // Render gizmo on top, in the top-left corner viewport.
    gl.autoClear = false
    gl.clearDepth()
    const x = pad
    const y = canvasSize.height - size - pad // top-left (WebGL y is bottom-up)
    gl.setViewport(x, y, size, size)
    gl.setScissor(x, y, size, size)
    gl.setScissorTest(true)
    gl.render(gizmoScene, gizmoCamera)
    gl.setScissorTest(false)

    // Restore full viewport for any downstream consumers.
    gl.setViewport(0, 0, canvasSize.width, canvasSize.height)
  }, 1)

  return createPortal(
    <group ref={groupRef}>
      {/* Translucent sphere body */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#9aa0a6" transparent opacity={0.25} />
      </mesh>

      <Axis dir={[1, 0, 0]} color="#ff3b30" label="X" />
      <Axis dir={[0, 1, 0]} color="#34c759" label="Y" />
      <Axis dir={[0, 0, 1]} color="#0a84ff" label="Z" />
    </group>,
    gizmoScene,
  )
}

/** A single axis: a shaft (thin cylinder) + a cone arrowhead + a text label. */
function Axis({
  dir,
  color,
  label,
}: {
  dir: [number, number, number]
  color: string
  label: string
}) {
  const to = new Vector3(...dir)
  const length = 1.8
  const shaftLen = length * 0.8
  const headLen = length - shaftLen

  // Orientation: default cylinder/cone point +Y; rotate +Y to `dir`.
  const quaternion = useMemo(() => {
    const q = new Quaternion()
    q.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().normalize())
    return q
  }, [dir[0], dir[1], dir[2]])

  const euler = useMemo(() => new Euler().setFromQuaternion(quaternion), [quaternion])

  const shaftPos = to.clone().multiplyScalar(shaftLen / 2)
  const headPos = to.clone().multiplyScalar(shaftLen + headLen / 2)
  const labelPos = to.clone().multiplyScalar(length + 0.32)

  return (
    <group>
      {/* shaft */}
      <mesh position={shaftPos.toArray()} rotation={euler}>
        <cylinderGeometry args={[0.05, 0.05, shaftLen, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* arrowhead */}
      <mesh position={headPos.toArray()} rotation={euler}>
        <coneGeometry args={[0.15, headLen, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* label */}
      <Text
        position={labelPos.toArray()}
        fontSize={0.5}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {label}
      </Text>
    </group>
  )
}
