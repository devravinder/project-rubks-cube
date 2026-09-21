import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { FACE_COLOR, type Face } from '../cube/facelet'
import type { StickerDef, Vec3 } from './geometry'

const CUBIE_SIZE = 0.94
const STICKER_SIZE = 0.82
const STICKER_OFFSET = 0.481

type CubieProps = {
  position: Vec3
  stickers: Array<{ def: StickerDef; color: Face }>
  onStickerPointerDown?: (e: ThreeEvent<PointerEvent>) => void
}

function stickerRotation(normal: Vec3): [number, number, number] {
  const [x, y, z] = normal
  if (y === 1) return [-Math.PI / 2, 0, 0]
  if (y === -1) return [Math.PI / 2, 0, 0]
  if (x === 1) return [0, Math.PI / 2, 0]
  if (x === -1) return [0, -Math.PI / 2, 0]
  if (z === 1) return [0, 0, 0]
  if (z === -1) return [0, Math.PI, 0]
  return [0, 0, 0]
}

/** One cubie with colored sticker tiles. Stickers carry userData for picking. */
export function Cubie({ position, stickers, onStickerPointerDown }: CubieProps) {
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
            userData={{ cubie: position, normal: def.normal }}
            onPointerDown={onStickerPointerDown}
          >
            <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
            <meshStandardMaterial color={FACE_COLOR[color]} roughness={0.35} metalness={0} />
          </mesh>
        )
      }),
    [stickers, position, onStickerPointerDown],
  )

  return (
    <group position={position}>
      <RoundedBox args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#141414" roughness={0.6} metalness={0} />
      </RoundedBox>
      {stickerMeshes}
    </group>
  )
}
