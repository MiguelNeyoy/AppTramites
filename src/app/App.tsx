import { Moon, Sun, ShieldCheck } from 'lucide-react'
import { useTheme } from './useTheme'
import { supabase } from '../lib/supabase'

export function App() {
  const { theme, toggleTheme } = useTheme()
  const isSupabaseConfigured = Boolean(supabase)

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-150">
      <header className="flex h-12 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-uas-blue text-xs font-bold text-white">
            UAS
          </div>
          <span className="text-sm font-bold tracking-tight">
            Trámites Escolares UAS
          </span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Cambiar tema"
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold">
                Arquitectura base inicializada
              </h1>
              <p className="text-xs text-muted-foreground">
                Esqueleto por features, sistema de diseño UAS (modo claro/oscuro) y cliente Supabase tipado listos.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
            <div className="rounded-lg bg-secondary/50 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Cliente Supabase
              </span>
              <p className="mt-1 font-mono text-xs font-semibold">
                {isSupabaseConfigured ? 'CONECTADO Y TIPADO' : 'PENDIENTE .ENV'}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Siguiente módulo
              </span>
              <p className="mt-1 font-mono text-xs font-semibold">
                src/features/auth
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
