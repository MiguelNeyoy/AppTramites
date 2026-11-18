import * as React from 'react'
import { toast } from 'sonner'

import { Toaster } from '@/components/ui/sonner'
import { LoginPage, useAuth } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { mapSupabaseError } from '@/services/shared'
import { useTheme } from './useTheme'

export function App() {
  const { theme, toggleTheme } = useTheme()
  const {
    sessionData,
    isLoadingSession,
    isPasswordRecovery,
    setSessionData,
    clearPasswordRecovery,
    signOut,
  } = useAuth()
  const [bypassedLogin, setBypassedLogin] = React.useState(false)

  const isAuthenticated = Boolean(sessionData) || bypassedLogin

  const handleLogout = async () => {
    if (sessionData) {
      try {
        await signOut()
        toast.success('Sesión cerrada correctamente.')
      } catch (error) {
        const mapped = mapSupabaseError(error)
        toast.error(mapped.message)
      }
    }
    setBypassedLogin(false)
  }

  return (
    <>
      {isLoadingSession ? (
        <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs font-medium text-muted-foreground">
              Verificando sesión institucional...
            </p>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <LoginPage
          theme={theme}
          onToggleTheme={toggleTheme}
          onLoginSuccess={(result) => setSessionData(result)}
          onBypassLogin={() => setBypassedLogin(true)}
          isPasswordRecovery={isPasswordRecovery}
          onClearPasswordRecovery={clearPasswordRecovery}
        />
      ) : (
        <DashboardPage
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={() => {
            void handleLogout()
          }}
          perfil={sessionData?.perfil ?? null}
        />
      )}
      <Toaster theme={theme} richColors position="top-center" />
    </>
  )
}

export default App
