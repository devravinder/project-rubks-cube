import { ThemeToggle } from './components/ThemeToggle'
import { CubePanel } from './components/CubePanel'
import { GraphPanel } from './components/GraphPanel'
import { Controls } from './components/Controls'
import { MovePad } from './components/MovePad'
import { StatusBadge } from './components/StatusBadge'

function App() {
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

      {/*
        Views area.
        - Mobile (default): column — cube on top, graph below, each flexing to
          share the available height so both fit within one screen.
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

      {/* Footer: status + tappable move pad. */}
      <footer className="flex shrink-0 flex-col items-center gap-2 border-t border-border px-3 py-2 sm:flex-row sm:justify-between sm:px-4">
        <StatusBadge />
        <MovePad />
      </footer>
    </div>
  )
}

export default App
