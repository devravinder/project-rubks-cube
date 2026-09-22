// One-off PWA icon generator: rasterizes public/app-icon.svg into the PNG sizes
// a web manifest needs. Run with: node scripts/generate-icons.mjs
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(resolve(root, 'public/app-icon.svg'), 'utf8')
const outDir = resolve(root, 'public/icons')
mkdirSync(outDir, { recursive: true })

/** Render the SVG at a target pixel width and write a PNG. */
function render(size, filename) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  })
  const png = resvg.render().asPng()
  writeFileSync(resolve(outDir, filename), png)
  console.log(`wrote icons/${filename} (${size}x${size})`)
}

// Standard PWA icons.
render(192, 'icon-192.png')
render(512, 'icon-512.png')
// Maskable: same art; the purple rounded background already fills the frame and
// the cube sits within the safe zone, so it doubles as the maskable icon.
render(512, 'icon-maskable-512.png')
// Apple touch icon.
render(180, 'apple-touch-icon.png')
// Favicon PNG fallback.
render(32, 'favicon-32.png')
