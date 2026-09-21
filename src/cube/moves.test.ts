import { describe, it, expect } from 'vitest'
import { solvedState, isSolved } from './facelet'
import {
  applyMove,
  applyMoves,
  invertMove,
  ALL_MOVES,
  type MoveName,
} from './moves'

describe('cube move engine', () => {
  it('solved state is solved', () => {
    expect(isSolved(solvedState())).toBe(true)
  })

  it('a single quarter turn is not solved', () => {
    expect(isSolved(applyMove(solvedState(), 'R'))).toBe(false)
  })

  it('any quarter turn applied 4 times returns to solved', () => {
    for (const move of ['U', 'R', 'F', 'D', 'L', 'B'] as MoveName[]) {
      let s = solvedState()
      for (let i = 0; i < 4; i++) s = applyMove(s, move)
      expect(isSolved(s), `${move} x4`).toBe(true)
    }
  })

  it('a move followed by its inverse returns to solved', () => {
    for (const move of ALL_MOVES) {
      const s = applyMoves(solvedState(), [move, invertMove(move)])
      expect(isSolved(s), `${move} then ${invertMove(move)}`).toBe(true)
    }
  })

  it('a double move applied twice returns to solved', () => {
    for (const move of ['U2', 'R2', 'F2', 'D2', 'L2', 'B2'] as MoveName[]) {
      const s = applyMoves(solvedState(), [move, move])
      expect(isSolved(s), `${move} x2`).toBe(true)
    }
  })

  it('the sexy move (R U R\' U\') has order 6', () => {
    let s = solvedState()
    for (let i = 0; i < 6; i++) {
      s = applyMoves(s, ['R', 'U', "R'", "U'"])
    }
    expect(isSolved(s)).toBe(true)
  })

  it('a superflip-like long sequence stays a valid permutation (54 stickers, 9 of each)', () => {
    const s = applyMoves(solvedState(), [
      'U', 'R', 'F', 'D', 'L', 'B', "U'", "R'", "F'", "D'", "L'", "B'",
    ])
    const counts: Record<string, number> = {}
    for (const c of s) counts[c] = (counts[c] ?? 0) + 1
    expect(Object.values(counts).sort()).toEqual([9, 9, 9, 9, 9, 9])
  })

  it('scramble then reverse of inverted moves returns to solved', () => {
    const scramble: MoveName[] = ['R', 'U', 'F', 'L', 'D', 'B', 'R2', "U'"]
    let s = applyMoves(solvedState(), scramble)
    const undo = scramble.slice().reverse().map(invertMove)
    s = applyMoves(s, undo)
    expect(isSolved(s)).toBe(true)
  })
})
