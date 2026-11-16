import {
  BarChart3,
  ClipboardCheck,
  FileSpreadsheet,
  FolderKanban,
  LogOut,
  X,
} from 'lucide-react'

import uasEscudo from '@/assets/uas-escudo.png'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { NivelFilter } from './dashboardMockData'

export type DashboardNavId =
  | 'dashboard'
  | 'tramites'
  | 'actas'
  | 'catalogos'

interface DashboardSidebarProps {
  activeNav: DashboardNavId
  onSelectNav: (id: DashboardNavId) => void
  nivel: NivelFilter
  onNivelChange: (nivel: NivelFilter) => void
  mobileOpen: boolean
  onCloseMobile: () => void
  onLogout: () => void
}

interface NavGroup {
  section: string
  items: {
    id: DashboardNavId
    label: string
    icon: typeof BarChart3
  }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'Principal',
    items: [
      { id: 'dashboard', label: 'Resumen Global', icon: BarChart3 },
      { id: 'tramites', label: 'Trámites Generales', icon: FileSpreadsheet },
    ],
  },
  {
    section: 'Seguimiento',
    items: [
      { id: 'actas', label: 'Checklist de Actas', icon: ClipboardCheck },
      { id: 'catalogos', label: 'Catálogos URS', icon: FolderKanban },
    ],
  },
]

export function DashboardSidebar({
  activeNav,
  onSelectNav,
  nivel,
  onNivelChange,
  mobileOpen,
  onCloseMobile,
  onLogout,
}: DashboardSidebarProps) {
  const sidebarContent = (
    <div className="flex h-full w-60 flex-col bg-card border-r border-border text-foreground">
      {/* Cabecera de Marca */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-uas-blue p-1">
            <img
              src={uasEscudo}
              alt="Escudo UAS"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="leading-tight">
            <span className="block text-sm font-bold tracking-tight">
              TrámitesUAS
            </span>
            <span className="block text-[10px] font-medium text-muted-foreground">
              Servicios Escolares
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCloseMobile}
          aria-label="Cerrar menú"
          className="h-7 w-7 lg:hidden text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Selector de División / Nivel (Visible en vista global/admin) */}
      <div className="px-3 pt-4 pb-2">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          División Académica
        </p>
        <Tabs
          value={nivel}
          onValueChange={(value) => onNivelChange(value as NivelFilter)}
        >
          <TabsList className="grid w-full grid-cols-3 h-8 bg-secondary/70 p-0.5">
            <TabsTrigger value="TODOS" className="text-[11px] px-1.5 h-7">
              Todos
            </TabsTrigger>
            <TabsTrigger value="BACHILLERATO" className="text-[11px] px-1.5 h-7">
              Prepas
            </TabsTrigger>
            <TabsTrigger value="LICENCIATURA" className="text-[11px] px-1.5 h-7">
              Facult.
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Navegación por secciones */}
      <nav aria-label="Navegación principal" className="flex-1 px-3 py-2.5 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = activeNav === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectNav(item.id)
                      onCloseMobile()
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                        : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground border border-transparent'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Tarjeta de Usuario y Salida */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            AD
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold">Admin Escolar</p>
            <p className="truncate text-[10px] text-muted-foreground">
              Vista Global URS
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full justify-start gap-2 h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Volver al login</span>
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Sidebar fijo en escritorio */}
      <aside className="hidden lg:block h-screen shrink-0">{sidebarContent}</aside>

      {/* Drawer móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            aria-hidden="true"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          />
          <div className="relative z-10 h-full shadow-xl">{sidebarContent}</div>
        </div>
      )}
    </>
  )
}
