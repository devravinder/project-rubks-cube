/**
 * Lightweight persistence for the 3D camera pose (position + orbit target).
 *
 * This is view-only state, kept separate from the cube's logical state store.
 * We save the camera position and the OrbitControls target so the exact view
 * (angle + zoom distance) is restored on refresh.
 */

const STORAGE_KEY = 'rubiks-cube-camera'

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
}

/** The default view (U up, F forward, R visible), used when nothing is saved. */
export const DEFAULT_CAMERA_POSE: CameraPose = {
  position: [5, 5, 6],
  target: [0, 0, 0],
}

/** Load the saved camera pose, or null if absent/invalid. */
export function loadCameraPose(): CameraPose | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CameraPose
    if (
      Array.isArray(parsed.position) &&
      parsed.position.length === 3 &&
      Array.isArray(parsed.target) &&
      parsed.target.length === 3 &&
      [...parsed.position, ...parsed.target].every((n) => Number.isFinite(n))
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/** Persist the current camera pose. */
export function saveCameraPose(pose: CameraPose): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pose))
  } catch {
    // Ignore storage errors (quota, private mode, etc.).
  }
}

/** Remove any saved camera pose (used when resetting the view). */
export function clearCameraPose(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
