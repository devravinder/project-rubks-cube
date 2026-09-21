import { ThemeToggle } from './components/ThemeToggle'
import { CubePanel } from './components/CubePanel'
import { GraphPanel } from './components/GraphPanel'
import { Controls } from './components/Controls'

function App() {
  return (
    <div className="flex h-[100svh] flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
        <h1 className="text-base font-semibold tracking-tight sm:text-lg">
          Rubik's Cube
        </h1>
        <div className="flex items-center gap-2">
          <Controls />
          <ThemeToggle />
        </div>
      </header>

      {/*
        Views area.
        - Mobile (default): column — cube on top, graph below, each taking half
          the available height so both fit within one screen.
        - Desktop (lg+): row — cube and graph side by side, full height.
      */}
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="min-h-0 flex-1 border-b border-border lg:border-b-0 lg:border-r">
          <CubePanel />
        </section>
        <section className="min-h-0 flex-1">
          <GraphPanel />
        </section>
      </main>
    </div>
  )
}

export default App
