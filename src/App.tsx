import { ThemeToggle } from './components/ThemeToggle'
import { CubePanel } from './components/CubePanel'
import { GraphPanel } from './components/GraphPanel'
import { Controls } from './components/Controls'
import { MovePad } from './components/MovePad'
import { StatusBadge } from './components/StatusBadge'
import { useCubeStore } from './store/cubeStore'
import TestPanel from './components/TestPanel'
import { AnimatedGraphPanel } from './components/AnimatedGraphPanel'

function App() {
  const test = useCubeStore((s) => s.test)
  console.log({ test })

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
        <h1 className="text-base font-semibold tracking-tight sm:text-lg">
          Rubik's Cube
        </h1>
        <div className="flex items-center gap-2">
          <Controls />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="min-h-0 flex-1 border-b border-border lg:border-b-0 lg:border-r">
          {test ? <TestPanel /> : <CubePanel />}
        </section>
        <section className="min-h-0 flex-1 border-b border-border lg:border-b-0 lg:border-r">
          <GraphPanel />
        </section>
        <section className="min-h-0 flex-1">
          <AnimatedGraphPanel />
        </section>
      </main>

      {/* Footer: status + tappable move pad. */}
      <footer className="flex shrink-0 flex-col items-center gap-2 border-t border-border px-3 py-2 sm:flex-row sm:justify-between sm:px-4">
        <StatusBadge />
        <MovePad />
      </footer>
    </div>
  )
}

export default App
