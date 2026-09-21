import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { FACE_COLOR, type Face } from '../cube/facelet'
import type { StickerDef, Vec3 } from './geometry'

const CUBIE_SIZE = 0.94 // slightly < 1 to leave visible gaps between cubies
const STICKER_SIZE = 0.82
const STICKER_OFFSET = 0.481 // just outside the cubie surface (half of 0.94 + epsilon)

type CubieProps = {
  position: Vec3
  /** Stickers on this cubie, with their current colors resolved from state. */
  stickers: Array<{ def: StickerDef; color: Face }>
}

/** A quaternion-free rotation for a sticker plane to face along its normal. */
function stickerRotation(normal: Vec3): [number, number, number] {
  const [x, y, z] = normal
  if (y === 1) return [-Math.PI / 2, 0, 0] // up
  if (y === -1) return [Math.PI / 2, 0, 0] // down
  if (x === 1) return [0, Math.PI / 2, 0] // right
  if (x === -1) return [0, -Math.PI / 2, 0] // left
  if (z === 1) return [0, 0, 0] // front
  if (z === -1) return [0, Math.PI, 0] // back
  return [0, 0, 0]
}

/** One small cube (cubie) with colored sticker tiles on its outward faces. */
export function Cubie({ position, stickers }: CubieProps) {
  const stickerMeshes = useMemo(
    () =>
      stickers.map(({ def, color }) => {
        const [nx, ny, nz] = def.normal
        const pos: Vec3 = [
          nx * STICKER_OFFSET,
          ny * STICKER_OFFSET,
          nz * STICKER_OFFSET,
        ]
        return (
          <mesh
            key={def.faceletIndex}
            position={pos}
            rotation={stickerRotation(def.normal)}
          >
            <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
            <meshStandardMaterial
              color={FACE_COLOR[color]}
              roughness={0.35}
              metalness={0}
            />
          </mesh>
        )
      }),
    [stickers],
  )

  return (
    <group position={position}>
      {/* Cubie body (plastic). */}
      <RoundedBox args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#141414" roughness={0.6} metalness={0} />
      </RoundedBox>
      {stickerMeshes}
    </group>
  )
}
