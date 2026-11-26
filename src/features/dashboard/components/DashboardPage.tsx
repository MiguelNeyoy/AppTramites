import * as React from 'react'
import { Menu, Moon, RefreshCw, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PerfilUsuario } from '@/services/login'
import { ChecklistActasView } from '@/features/actas'
import { CatalogosView } from '@/features/catalogos'
import { FichasNuevoIngresoView } from '@/features/fichas'
import { TramitesAlumnosView } from '@/features/tramites'
import { UsuariosView } from '@/features/usuarios'
import { DashboardSidebar, type DashboardNavId } from './DashboardSidebar'
import type { NivelFilter } from '../types'

interface DashboardPageProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onLogout: () => void
  perfil?: PerfilUsuario | null
}

export function DashboardPage({
  theme,
  onToggleTheme,
  onLogout,
  perfil,
}: DashboardPageProps) {
  const [activeNav, setActiveNav] = React.useState<DashboardNavId>(() =>
    perfil?.rol === 'NUEVO_INGRESO' ? 'fichas' : 'alumnos'
  )
  const [nivel, setNivel] = React.useState<NivelFilter>('TODOS')
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [refreshSignal, setRefreshSignal] = React.useState(0)
  const [isActiveViewLoading, setIsActiveViewLoading] = React.useState(false)

  const handleSelectNav = (nextNav: DashboardNavId) => {
    setIsActiveViewLoading(false)
    setActiveNav(nextNav)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-150">
      <DashboardSidebar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        nivel={nivel}
        onNivelChange={setNivel}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={onLogout}
        perfil={perfil}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Botón flotante para menú móvil (sin nav superior) */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menú"
          className="absolute left-4 top-4 z-30 h-9 w-9 bg-card text-muted-foreground shadow-sm lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Controles flotantes en esquina superior derecha: Actualizar + Tema */}
        <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isActiveViewLoading}
            onClick={() => setRefreshSignal((prev) => prev + 1)}
            aria-label="Actualizar"
            title="Actualizar"
            className="h-9 w-9 bg-card text-muted-foreground shadow-sm transition-all duration-150 hover:text-foreground"
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                isActiveViewLoading && 'animate-spin'
              )}
            />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onToggleTheme}
            aria-label="Cambiar tema"
            title="Cambiar tema"
            className="h-9 w-9 bg-card text-muted-foreground shadow-sm transition-all duration-150 hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-uas-gold" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <main className="flex-1 space-y-5 overflow-y-auto p-4 pt-16 sm:p-6 lg:pt-4">
          {activeNav === 'actas' ? (
            <ChecklistActasView
              nivel={nivel}
              currentUserId={perfil?.id}
              refreshSignal={refreshSignal}
              onLoadingChange={setIsActiveViewLoading}
            />
          ) : activeNav === 'fichas' ? (
            <FichasNuevoIngresoView
              userRol={perfil?.rol}
              refreshSignal={refreshSignal}
              onLoadingChange={setIsActiveViewLoading}
            />
          ) : activeNav === 'catalogos' ? (
            <CatalogosView
              nivel={nivel}
              refreshSignal={refreshSignal}
              onLoadingChange={setIsActiveViewLoading}
            />
          ) : activeNav === 'usuarios' ? (
            <UsuariosView
              isAdmin={perfil?.rol === 'ADMIN'}
              currentUserId={perfil?.id}
              refreshSignal={refreshSignal}
              onLoadingChange={setIsActiveViewLoading}
            />
          ) : (
            <TramitesAlumnosView
              nivel={nivel}
              userRol={perfil?.rol}
              refreshSignal={refreshSignal}
              onLoadingChange={setIsActiveViewLoading}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default DashboardPage
