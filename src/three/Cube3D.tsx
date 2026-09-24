import { useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Group } from 'three'
import { Text } from '@react-three/drei'
import { useCubeStore } from '../store/cubeStore'
import type { Face } from '../cube/facelet'
import type { MoveName } from '../cube/moves'
import { Cubie } from './Cubie'
import {
  buildStickerDefs,
  cubieKey,
  type StickerDef,
  type Vec3,
} from './geometry'

const STICKER_DEFS = buildStickerDefs()

type CubieGroup = { position: Vec3; defs: StickerDef[] }

function groupByCubie(): CubieGroup[] {
  const map = new Map<string, CubieGroup>()
  for (const def of STICKER_DEFS) {
    const key = cubieKey(def.cubie)
    let group = map.get(key)
    if (!group) {
      group = { position: def.cubie, defs: [] }
      map.set(key, group)
    }
    group.defs.push(def)
  }
  return [...map.values()]
}

const axisIndex = { x: 0, y: 1, z: 2 } as const

export type TurnAnim = {
  axis: 'x' | 'y' | 'z'
  layer: number
  angle: number
  move: MoveName
}

export type Cube3DHandle = {
  startTurn: (turn: TurnAnim) => void
  isAnimating: () => boolean
}

type Cube3DProps = {
  onStickerPointerDown?: (e: ThreeEvent<PointerEvent>) => void
}

const TURN_SPEED = 8

export const Cube3D = forwardRef<Cube3DHandle, Cube3DProps>(function Cube3D(
  { onStickerPointerDown },
  ref,
) {
  const state = useCubeStore((s) => s.state)
  const applyMove = useCubeStore((s) => s.applyMove)
  const debug = useCubeStore((s) => s.debug)
  const groups = useMemo(() => groupByCubie(), [])

  const pivotRef = useRef<Group>(null)
  const [anim, setAnim] = useState<TurnAnim | null>(null)
  const progress = useRef(0)

  useImperativeHandle(ref, () => ({
    startTurn: (turn) => {
      if (anim) return
      progress.current = 0
      if (pivotRef.current) pivotRef.current.rotation.set(0, 0, 0)
      setAnim(turn)
    },
    isAnimating: () => anim !== null,
  }))

  useFrame((_, delta) => {
    if (!anim || !pivotRef.current) return
    progress.current = Math.min(1, progress.current + delta * (TURN_SPEED / (Math.PI / 2)))
    pivotRef.current.rotation[anim.axis] = anim.angle * progress.current

    if (progress.current >= 1) {
      applyMove(anim.move)
      pivotRef.current.rotation.set(0, 0, 0)
      progress.current = 0
      setAnim(null)
    }
  })

  const isInLayer = (pos: Vec3) =>
    anim ? pos[axisIndex[anim.axis]] === anim.layer : false

  const renderCubie = (group: CubieGroup) => (
    <Cubie
      key={cubieKey(group.position)}
      position={group.position}
      stickers={group.defs.map((def) => ({
        def,
        color: state[def.faceletIndex] as Face,
      }))}
      onStickerPointerDown={onStickerPointerDown}
      debug={debug}
    />
  )

  return (
    <group>
      {groups.filter((g) => !isInLayer(g.position)).map(renderCubie)}
      <group ref={pivotRef}>
        {anim && groups.filter((g) => isInLayer(g.position)).map(renderCubie)}
      </group>

      {/* Big face-centre labels — shown only when NOT in debug mode (debug
          shows per-sticker facelet indices instead). */}
      {!debug && (
        <>
          <Text position={[0, 0, 1.5]} fontSize={0.8} color="black" anchorX="center" anchorY="middle">
            F
          </Text>
          <Text position={[0, 0, -1.5]} fontSize={0.8} color="black" anchorX="center" anchorY="middle" rotation={[0, Math.PI, 0]}>
            B
          </Text>
          <Text position={[1.5, 0, 0]} fontSize={0.8} color="black" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
            R
          </Text>
          <Text position={[-1.5, 0, 0]} fontSize={0.8} color="black" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]}>
            L
          </Text>
          <Text position={[0, 1.5, 0]} fontSize={0.8} color="black" anchorX="center" anchorY="middle" rotation={[Math.PI / 2, 0, Math.PI]}>
            U
          </Text>
          <Text position={[0, -1.5, 0]} fontSize={0.8} color="black" anchorX="center" anchorY="middle" rotation={[Math.PI / 2, 0, 0]}>
            D
          </Text>
        </>
      )}
    </group>
  )
})
