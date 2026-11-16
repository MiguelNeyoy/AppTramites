import * as React from 'react'
import { useTheme } from './useTheme'
import { LoginPage } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { Toaster } from '@/components/ui/sonner'

export function App() {
  const { theme, toggleTheme } = useTheme()
  const [bypassedLogin, setBypassedLogin] = React.useState(false)

  return (
    <>
      {!bypassedLogin ? (
        <LoginPage
          theme={theme}
          onToggleTheme={toggleTheme}
          onBypassLogin={() => setBypassedLogin(true)}
        />
      ) : (
        <DashboardPage
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={() => setBypassedLogin(false)}
        />
      )}
      <Toaster theme={theme} richColors position="top-center" />
    </>
  )
}

export default App
