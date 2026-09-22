// min2phase.js is a CommonJS module: `module.exports = min2phase` where
// `min2phase` is the object below. Declare it as a default export so it can be
// imported as `import min2phase from './min2phase.js'`.
declare const min2phase: {
  Search: new () => {
    solution(
      facelets: string,
      maxDepth?: number,
      probeMax?: number,
      probeMin?: number,
      verbose?: number,
      firstAxisFilter?: number,
      lastAxisFilter?: number,
    ): string
    next(probeMax?: number, probeMin?: number, verbose?: number): string
  }
  solve(facelet: string): string
  fromScramble(scramble: string): string
  randomCube(): string
  initFull(): void
  INVERSE_SOLUTION: number
}

export default min2phase
