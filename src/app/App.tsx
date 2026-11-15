import * as React from 'react'
import { LogOut, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useTheme } from './useTheme'
import { supabase } from '@/lib/supabase'
import { LoginPage } from '@/features/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function App() {
  const { theme, toggleTheme } = useTheme()
  const [bypassedLogin, setBypassedLogin] = React.useState(false)
  const isSupabaseConfigured = Boolean(supabase)

  if (!bypassedLogin) {
    return (
      <LoginPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onBypassLogin={() => setBypassedLogin(true)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-150">
      <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-uas-blue text-xs font-bold text-white">
            UAS
          </div>
          <span className="text-sm font-bold tracking-tight">
            Trámites Escolares UAS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBypassedLogin(false)}
            className="h-8 gap-1.5 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Volver al login</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-uas-gold" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-6">
        <Card className="border-border shadow-sm dark:shadow-none">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">
                Arquitectura base inicializada
              </CardTitle>
              <CardDescription className="text-xs">
                Esqueleto por features, sistema de diseño UAS (modo claro/oscuro) y cliente Supabase tipado listos.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
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
                Módulo Autenticación
              </span>
              <p className="mt-1 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                UI Login lista (Issue #2)
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
