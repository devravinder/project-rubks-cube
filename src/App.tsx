import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Rubik's Cube</h1>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">
          Theme + Tailwind ready. Cube and graph coming next.
        </p>
      </main>
    </div>
  )
}

export default App
