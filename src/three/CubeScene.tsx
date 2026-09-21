import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Cube3D } from './Cube3D'

/**
 * The Three.js scene: camera, lighting, the cube, and baseline orbit controls.
 * (Corner/layer drag interaction replaces/augments OrbitControls in the next task.)
 */
export function CubeScene() {
  return (
    <Canvas
      camera={{ position: [4, 4, 5.5], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Lighting — tuned to read well on both light and dark backgrounds. */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 6]} intensity={1.1} />
      <directionalLight position={[-6, -3, -4]} intensity={0.35} />

      <Cube3D />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={4}
        maxDistance={12}
        rotateSpeed={0.9}
      />
    </Canvas>
  )
}
