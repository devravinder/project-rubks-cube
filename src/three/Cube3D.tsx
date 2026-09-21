import { useMemo } from 'react'
import { useCubeStore } from '../store/cubeStore'
import type { Face } from '../cube/facelet'
import { Cubie } from './Cubie'
import {
  buildStickerDefs,
  cubieKey,
  type StickerDef,
  type Vec3,
} from './geometry'

/** Precomputed sticker definitions grouped by cubie (stable across renders). */
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

/**
 * The full cube: 26 cubies, each showing sticker colors resolved from the
 * shared store state. This is a static (non-animated) render of the current
 * state; drag-to-turn animation is layered on in the interaction task.
 */
export function Cube3D() {
  const state = useCubeStore((s) => s.state)
  const groups = useMemo(() => groupByCubie(), [])

  return (
    <group>
      {groups.map((group) => (
        <Cubie
          key={cubieKey(group.position)}
          position={group.position}
          stickers={group.defs.map((def) => ({
            def,
            color: state[def.faceletIndex] as Face,
          }))}
        />
      ))}
    </group>
  )
}
