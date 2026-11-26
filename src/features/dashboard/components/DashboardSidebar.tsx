import {
  ClipboardCheck,
  FileSpreadsheet,
  FolderKanban,
  LogOut,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import uasEscudo from '@/assets/uas-escudo.png'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { PerfilUsuario } from '@/services/login'
import type { NivelFilter } from '../types'

export type DashboardNavId =
  | 'alumnos'
  | 'fichas'
  | 'actas'
  | 'catalogos'
  | 'usuarios'

interface DashboardSidebarProps {
  activeNav: DashboardNavId
  onSelectNav: (id: DashboardNavId) => void
  nivel: NivelFilter
  onNivelChange: (nivel: NivelFilter) => void
  mobileOpen: boolean
  onCloseMobile: () => void
  onLogout: () => void
  perfil?: PerfilUsuario | null
}

interface NavGroup {
  section: string
  items: {
    id: DashboardNavId
    label: string
    icon: typeof FileSpreadsheet
    adminOnly?: boolean
  }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'Principal',
    items: [
      { id: 'alumnos', label: 'General', icon: FileSpreadsheet },
      { id: 'fichas', label: 'Nuevo Ingreso', icon: UserPlus },
    ],
  },
  {
    section: 'Seguimiento',
    items: [
      { id: 'actas', label: 'Checklist de Actas', icon: ClipboardCheck },
      { id: 'catalogos', label: 'Catálogos URS', icon: FolderKanban },
      { id: 'usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
    ],
  },
]

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador URS',
  LICENCIATURA: 'Control Escolar Licenciatura',
  BACHILLERATO: 'Control Escolar Bachillerato',
  NUEVO_INGRESO: 'Fichas Nuevo Ingreso',
  UNIDAD_ACADEMICA: 'Control por Unidad Académica',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return 'US'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function DashboardSidebar({
  activeNav,
  onSelectNav,
  nivel,
  onNivelChange,
  mobileOpen,
  onCloseMobile,
  onLogout,
  perfil,
}: DashboardSidebarProps) {
  const displayName = perfil?.nombre ?? 'Admin Escolar'
  const displayRole = perfil ? ROLE_LABEL[perfil.rol] ?? perfil.rol : 'Vista Global URS'
  const initials = perfil ? getInitials(perfil.nombre) : 'AD'

  const sidebarContent = (
    <div className="flex h-full w-60 flex-col border-r border-border bg-card text-foreground">
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
          className="h-7 w-7 text-muted-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pb-2 pt-4">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          División Académica
        </p>
        {perfil?.rol === 'NUEVO_INGRESO' ? (
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
            Bachillerato y Licenciatura
          </div>
        ) : perfil?.rol === 'UNIDAD_ACADEMICA' ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            Unidad Académica Asignada
          </div>
        ) : (
          <Tabs
            value={nivel}
            onValueChange={(value) => onNivelChange(value as NivelFilter)}
          >
            <TabsList className="grid h-8 w-full grid-cols-3 bg-secondary/70 p-0.5">
              <TabsTrigger value="TODOS" className="h-7 px-1.5 text-[11px]">
                Todos
              </TabsTrigger>
              <TabsTrigger value="BACHILLERATO" className="h-7 px-1.5 text-[11px]">
                Prepas
              </TabsTrigger>
              <TabsTrigger value="LICENCIATURA" className="h-7 px-1.5 text-[11px]">
                Facult.
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <nav aria-label="Navegación principal" className="flex-1 space-y-3.5 px-3 py-2">
        {NAV_GROUPS.map((group) => {
          const isAdminUser = perfil?.rol === 'ADMIN'
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || isAdminUser
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={group.section}>
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.section}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
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
                        'flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
                        isActive
                          ? 'border-primary/20 bg-primary/10 font-semibold text-primary'
                          : 'border-transparent text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold">{displayName}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {displayRole}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="h-8 w-full justify-start gap-2 px-2.5 text-xs text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{perfil ? 'Cerrar sesión' : 'Volver al login'}</span>
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden h-screen shrink-0 lg:block">{sidebarContent}</aside>

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
