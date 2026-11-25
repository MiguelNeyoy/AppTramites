import * as React from 'react'
import {
  Building2,
  Calendar,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { NivelFilter } from '@/features/dashboard/types'
import {
  deriveCicloEscolar,
  formatCicloEscolarLabel,
  type PeriodoEscolarCatalogo,
  type PeriodoEscolarInput,
  type ProgramaEducativoCatalogo,
  type ProgramaEducativoInput,
  type TipoTramiteCatalogo,
  type TipoTramiteInput,
  type UnidadAcademicaCatalogo,
  type UnidadAcademicaInput,
} from '@/services/catalogos'
import { useCatalogos, type DeleteTarget } from '../hooks/useCatalogos'
import {
  ConfirmarEliminacionModal,
  PeriodoFormModal,
  ProgramaFormModal,
  TramiteCatalogoModal,
  UnidadFormModal,
} from './CatalogosModals'

interface CatalogosViewProps {
  nivel: NivelFilter
  refreshSignal?: number
  onLoadingChange?: (loading: boolean) => void
}

type CatalogoTab = 'unidades' | 'tramites' | 'periodos'
type EstadoFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS'

export function CatalogosView({
  nivel,
  refreshSignal,
  onLoadingChange,
}: CatalogosViewProps) {
  const [activeTab, setActiveTab] = React.useState<CatalogoTab>('unidades')
  const [localNivelFilter, setLocalNivelFilter] = React.useState<NivelFilter>('TODOS')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [estadoFilter, setEstadoFilter] = React.useState<EstadoFilter>('TODOS')
  const [moduloFilter, setModuloFilter] = React.useState<
    'TODOS' | 'TRAMITES_GENERALES' | 'NUEVO_INGRESO'
  >('TODOS')

  const {
    unidades,
    programas,
    tramites,
    periodos,
    isLoading,
    isMutating,
    isOfflinePreview,
    reload,
    saveUnidad,
    toggleUnidadActiva,
    savePrograma,
    toggleProgramaActivo,
    saveTramite,
    toggleTramiteActivo,
    savePeriodo,
    generateNextCiclo,
    togglePeriodoActivo,
    removeItem,
  } = useCatalogos()

  const reloadRef = React.useRef(reload)
  const prevRefreshSignalRef = React.useRef(refreshSignal)
  React.useEffect(() => {
    reloadRef.current = reload
  }, [reload])

  React.useEffect(() => {
    if (
      refreshSignal !== undefined &&
      refreshSignal !== prevRefreshSignalRef.current
    ) {
      prevRefreshSignalRef.current = refreshSignal
      void reloadRef.current()
    }
  }, [refreshSignal])

  React.useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  const [selectedUnidadId, setSelectedUnidadId] = React.useState<number>(0)

  // Estados de modales CRUD
  const [unidadModalOpen, setUnidadModalOpen] = React.useState(false)
  const [editingUnidad, setEditingUnidad] =
    React.useState<UnidadAcademicaCatalogo | null>(null)

  const [programaModalOpen, setProgramaModalOpen] = React.useState(false)
  const [editingPrograma, setEditingPrograma] =
    React.useState<ProgramaEducativoCatalogo | null>(null)

  const [tramiteModalOpen, setTramiteModalOpen] = React.useState(false)
  const [editingTramite, setEditingTramite] =
    React.useState<TipoTramiteCatalogo | null>(null)

  const [periodoModalOpen, setPeriodoModalOpen] = React.useState(false)
  const [editingPeriodo, setEditingPeriodo] =
    React.useState<PeriodoEscolarCatalogo | null>(null)

  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(
    null
  )

  // Si el selector global del sidebar filtra por nivel, tiene prioridad sobre el filtro local
  const effectiveNivelFilter = nivel !== 'TODOS' ? nivel : localNivelFilter

  const unidadesFiltered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return unidades.filter((ua) => {
      const matchesNivel =
        effectiveNivelFilter === 'TODOS' || ua.nivel === effectiveNivelFilter
      const matchesEstado =
        estadoFilter === 'TODOS' ||
        (estadoFilter === 'ACTIVOS' ? ua.activa : !ua.activa)
      const progMatch = programas.some(
        (p) =>
          p.unidadAcademicaId === ua.id &&
          (p.nombre.toLowerCase().includes(q) ||
            p.clavePrograma.toLowerCase().includes(q))
      )
      const matchesQuery =
        !q ||
        ua.claveUa.toLowerCase().includes(q) ||
        ua.nombre.toLowerCase().includes(q) ||
        progMatch
      return matchesNivel && matchesEstado && matchesQuery
    })
  }, [effectiveNivelFilter, estadoFilter, programas, searchQuery, unidades])

  // Derivar unidad seleccionada visible sin efectos síncronos
  const activeSelectedUnidad =
    unidadesFiltered.find((u) => u.id === selectedUnidadId) ??
    unidadesFiltered[0] ??
    null

  const programasDeUnidadSeleccionada = React.useMemo(() => {
    if (!activeSelectedUnidad) return []
    return programas.filter(
      (p) => p.unidadAcademicaId === activeSelectedUnidad.id
    )
  }, [activeSelectedUnidad, programas])

  const tramitesFiltered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return tramites.filter((t) => {
      const matchesEstado =
        estadoFilter === 'TODOS' ||
        (estadoFilter === 'ACTIVOS' ? t.activo : !t.activo)
      const matchesModulo =
        moduloFilter === 'TODOS' || t.modulo === moduloFilter
      const matchesQuery = !q || t.nombre.toLowerCase().includes(q)
      return matchesEstado && matchesModulo && matchesQuery
    })
  }, [estadoFilter, moduloFilter, searchQuery, tramites])

  const periodosFiltered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return periodos.filter((p) => {
      const matchesEstado =
        estadoFilter === 'TODOS' ||
        (estadoFilter === 'ACTIVOS' ? p.activo : !p.activo)
      const matchesQuery =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        String(p.numeroPeriodo).includes(q) ||
        p.fechaInicio.includes(q) ||
        p.fechaFin.includes(q)
      return matchesEstado && matchesQuery
    })
  }, [estadoFilter, periodos, searchQuery])

  const countPrepas = unidades.filter((u) => u.nivel === 'BACHILLERATO').length
  const countFacultades = unidades.filter(
    (u) => u.nivel === 'LICENCIATURA'
  ).length

  /* ---------------- Handlers CRUD con servicio Supabase ---------------- */
  const handleSaveUnidad = async (
    payload: UnidadAcademicaInput,
    editId?: number
  ) => {
    const savedId = await saveUnidad(payload, editId)
    if (savedId !== null) {
      setSelectedUnidadId(savedId)
      return true
    }
    return false
  }

  const handleSavePrograma = async (
    payload: ProgramaEducativoInput,
    editId?: number
  ) => savePrograma(payload, editId)

  const handleSaveTramite = async (
    payload: TipoTramiteInput,
    editId?: number
  ) => saveTramite(payload, editId)

  const handleSavePeriodo = async (
    payload: PeriodoEscolarInput,
    editId?: number
  ) => savePeriodo(payload, editId)

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const ok = await removeItem(deleteTarget)
    if (ok) {
      setDeleteTarget(null)
    }
  }

  const openCreatePrimaryAction = () => {
    if (activeTab === 'unidades') {
      setEditingUnidad(null)
      setUnidadModalOpen(true)
    } else if (activeTab === 'tramites') {
      setEditingTramite(null)
      setTramiteModalOpen(true)
    } else {
      setEditingPeriodo(null)
      setPeriodoModalOpen(true)
    }
  }

  return (
    <div className="space-y-4">
      {isOfflinePreview && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-foreground">
          <span>
            Vista previa local activa (sin sesión autenticada o sin conexión a Supabase). Los cambios no se persisten en PostgreSQL hasta iniciar sesión con red activa.
          </span>
        </div>
      )}

      {/* Pestañas Principales del Catálogo */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:pr-24">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as CatalogoTab)
            setSearchQuery('')
            setEstadoFilter('TODOS')
          }}
        >
          <TabsList className="h-9 bg-secondary/70 p-1">
            <TabsTrigger value="unidades" className="h-7 gap-1.5 px-3 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              <span>Unidades y Programas ({unidades.length})</span>
            </TabsTrigger>
            <TabsTrigger value="tramites" className="h-7 gap-1.5 px-3 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span>Tipos de Trámite ({tramites.length})</span>
            </TabsTrigger>
            <TabsTrigger value="periodos" className="h-7 gap-1.5 px-3 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              <span>Periodos Escolares ({periodos.length})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'unidades' && nivel === 'TODOS' && (
          <Tabs
            value={localNivelFilter}
            onValueChange={(value) => setLocalNivelFilter(value as NivelFilter)}
          >
            <TabsList className="h-8 bg-secondary/50 p-0.5">
              <TabsTrigger value="TODOS" className="h-7 px-2.5 text-[11px]">
                Todas ({unidades.length})
              </TabsTrigger>
              <TabsTrigger value="BACHILLERATO" className="h-7 px-2.5 text-[11px]">
                Preparatorias ({countPrepas})
              </TabsTrigger>
              <TabsTrigger value="LICENCIATURA" className="h-7 px-2.5 text-[11px]">
                Facultades ({countFacultades})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Barra de Búsqueda, Filtros y Acción Principal */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5 shadow-sm dark:shadow-none xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'unidades'
                  ? 'Buscar por clave UA, preparatoria, facultad o programa educativo...'
                  : activeTab === 'tramites'
                    ? 'Buscar por nombre de trámite...'
                    : 'Buscar por ciclo escolar, número de periodo o fecha...'
              }
              className="h-8 bg-background pl-8 text-xs"
            />
          </div>

          {activeTab === 'tramites' && (
            <div className="w-full sm:w-48">
              <Select
                value={moduloFilter}
                onValueChange={(v) =>
                  setModuloFilter(
                    v as 'TODOS' | 'TRAMITES_GENERALES' | 'NUEVO_INGRESO'
                  )
                }
              >
                <SelectTrigger className="h-8 bg-background text-xs">
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS" className="text-xs">
                    Todos los módulos
                  </SelectItem>
                  <SelectItem value="TRAMITES_GENERALES" className="text-xs">
                    Trámites Generales
                  </SelectItem>
                  <SelectItem value="NUEVO_INGRESO" className="text-xs">
                    Nuevo Ingreso
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-full sm:w-40">
            <Select
              value={estadoFilter}
              onValueChange={(v) => setEstadoFilter(v as EstadoFilter)}
            >
              <SelectTrigger className="h-8 bg-background text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS" className="text-xs">
                  Todos los estados
                </SelectItem>
                <SelectItem value="ACTIVOS" className="text-xs">
                  Solo activos
                </SelectItem>
                <SelectItem value="INACTIVOS" className="text-xs">
                  Solo inactivos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {activeTab === 'periodos' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isMutating}
              onClick={() => void generateNextCiclo()}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Generar siguiente ciclo (P1 y P2)</span>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={isMutating}
            onClick={openCreatePrimaryAction}
            className="h-9 gap-1.5 bg-primary font-bold text-xs text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>
              {activeTab === 'unidades'
                ? 'Nueva Unidad Académica'
                : activeTab === 'tramites'
                  ? 'Nuevo Tipo de Trámite'
                  : 'Nuevo Periodo Escolar'}
            </span>
          </Button>
        </div>
      </div>

      {/* Contenido Principal por Pestaña */}
      {isLoading ? (
        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardContent className="flex items-center justify-center gap-2.5 py-14 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Cargando catálogos institucionales...</span>
          </CardContent>
        </Card>
      ) : activeTab === 'unidades' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          {/* Maestro: Tabla de Unidades Académicas y Preparatorias */}
          <Card className="lg:col-span-7 border-border bg-card shadow-sm dark:shadow-none">
            <CardContent className="pt-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table wrapperClassName="max-h-[520px] overflow-y-auto">
                  <TableHeader className="sticky top-0 z-10 bg-secondary/95 backdrop-blur-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                        Clave UA
                      </TableHead>
                      <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                        Unidad Académica
                      </TableHead>
                      <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                        Prog.
                      </TableHead>
                      <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                        Activa
                      </TableHead>
                      <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unidadesFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-xs text-muted-foreground"
                        >
                          No hay unidades académicas con ese filtro.
                        </TableCell>
                      </TableRow>
                    ) : (
                      unidadesFiltered.map((ua) => {
                        const isSelected = activeSelectedUnidad?.id === ua.id
                        const totalProgUa = programas.filter(
                          (p) => p.unidadAcademicaId === ua.id
                        ).length

                        return (
                          <TableRow
                            key={ua.id}
                            onClick={() => setSelectedUnidadId(ua.id)}
                            className={cn(
                              'cursor-pointer transition-colors duration-150',
                              isSelected
                                ? 'bg-primary/10 hover:bg-primary/15'
                                : 'hover:bg-secondary/30',
                              !ua.activa && 'opacity-65'
                            )}
                          >
                            <TableCell className="py-2.5">
                              <Badge
                                variant={isSelected ? 'default' : 'secondary'}
                                className="font-mono tabular-nums text-[10px] font-bold"
                              >
                                {ua.claveUa}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-foreground leading-snug">
                                  {ua.nombre}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] font-medium',
                                    ua.nivel === 'BACHILLERATO'
                                      ? 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                      : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                  )}
                                >
                                  {ua.nivel === 'BACHILLERATO'
                                    ? 'Preparatoria'
                                    : 'Licenciatura'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <span className="font-mono tabular-nums text-xs text-muted-foreground">
                                {totalProgUa}
                              </span>
                            </TableCell>
                            <TableCell
                              className="py-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Switch
                                checked={ua.activa}
                                disabled={isMutating}
                                onCheckedChange={() => void toggleUnidadActiva(ua)}
                                aria-label={`Estado de ${ua.nombre}`}
                              />
                            </TableCell>
                            <TableCell
                              className="py-2.5 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingUnidad(ua)
                                    setUnidadModalOpen(true)
                                  }}
                                  aria-label={`Editar ${ua.nombre}`}
                                  className="h-7 w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setDeleteTarget({ kind: 'unidad', item: ua })
                                  }
                                  aria-label={`Eliminar ${ua.nombre}`}
                                  className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Detalle: Programas Educativos de la Unidad Seleccionada */}
          <Card className="lg:col-span-5 lg:sticky lg:top-4 border-border bg-card shadow-sm dark:shadow-none">
            <CardHeader className="border-b border-border/70 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                    <CardTitle className="truncate text-base font-bold">
                      Programas Educativos
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-0.5 truncate text-xs">
                    {activeSelectedUnidad
                      ? `[${activeSelectedUnidad.claveUa}] ${activeSelectedUnidad.nombre}`
                      : 'Selecciona una unidad académica'}
                  </CardDescription>
                </div>

                {activeSelectedUnidad && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPrograma(null)
                      setProgramaModalOpen(true)
                    }}
                    className="h-8 shrink-0 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    <span>Programa</span>
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="max-h-[480px] space-y-2.5 overflow-y-auto pt-4">
              {!activeSelectedUnidad ? (
                <div className="rounded-lg border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
                  Elige una unidad académica de la tabla para ver sus programas.
                </div>
              ) : programasDeUnidadSeleccionada.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
                  Esta unidad no tiene programas educativos registrados aún.
                </div>
              ) : (
                programasDeUnidadSeleccionada.map((prog) => (
                  <div
                    key={prog.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/25 px-3.5 py-2.5 transition-colors duration-150',
                      !prog.activo && 'opacity-60'
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono tabular-nums text-[10px] font-bold"
                        >
                          {prog.clavePrograma}
                        </Badge>
                        <p className="truncate text-xs font-semibold text-foreground">
                          {prog.nombre}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-block text-[10px] font-medium',
                          prog.activo
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground'
                        )}
                      >
                        {prog.activo ? 'Activo en captura' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <Switch
                        checked={prog.activo}
                        disabled={isMutating}
                        onCheckedChange={() => void toggleProgramaActivo(prog)}
                        aria-label={`Estado de ${prog.nombre}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPrograma(prog)
                          setProgramaModalOpen(true)
                        }}
                        aria-label={`Editar ${prog.nombre}`}
                        className="h-7 w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteTarget({ kind: 'programa', item: prog })
                        }
                        aria-label={`Eliminar ${prog.nombre}`}
                        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'tramites' ? (
        /* TAB 2: Catálogo de Tipos de Trámite */
        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardContent className="pt-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      ID
                    </TableHead>
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      Nombre del Trámite
                    </TableHead>
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      Módulo
                    </TableHead>
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      Respaldo PDF
                    </TableHead>
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      Activo
                    </TableHead>
                    <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tramitesFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-xs text-muted-foreground"
                      >
                        No hay tipos de trámite que coincidan con el filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tramitesFiltered.map((tramite) => (
                      <TableRow
                        key={tramite.id}
                        className={cn(
                          'h-11 hover:bg-secondary/30 transition-colors duration-150',
                          !tramite.activo && 'opacity-60'
                        )}
                      >
                        <TableCell className="py-2">
                          <Badge
                            variant="secondary"
                            className="font-mono tabular-nums text-[10px] font-bold"
                          >
                            #{tramite.id}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-xs font-semibold text-foreground">
                          {tramite.nombre}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-medium',
                              tramite.modulo === 'NUEVO_INGRESO'
                                ? 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            )}
                          >
                            {tramite.modulo === 'NUEVO_INGRESO'
                              ? 'Nuevo Ingreso'
                              : 'Trámites Generales'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          {tramite.permitePdf ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/25 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400"
                            >
                              PDF habilitado
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              No requerido
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <Switch
                            checked={tramite.activo}
                            disabled={isMutating}
                            onCheckedChange={() =>
                              void toggleTramiteActivo(tramite)
                            }
                            aria-label={`Estado de ${tramite.nombre}`}
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingTramite(tramite)
                                setTramiteModalOpen(true)
                              }}
                              aria-label={`Editar ${tramite.nombre}`}
                              className="h-7 w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDeleteTarget({ kind: 'tramite', item: tramite })
                              }
                              aria-label={`Eliminar ${tramite.nombre}`}
                              className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* TAB 3: Catálogo de Periodos Escolares */
        <Card className="border-border bg-card shadow-sm dark:shadow-none">
          <CardContent className="pt-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      Ciclo / Nombre
                    </TableHead>
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      No. Periodo
                    </TableHead>
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      Fecha Inicio
                    </TableHead>
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      Fecha Fin
                    </TableHead>
                    <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-widest">
                      Activo
                    </TableHead>
                    <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-widest">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodosFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-xs text-muted-foreground"
                      >
                        No hay periodos escolares que coincidan con el filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    periodosFiltered.map((periodo) => (
                      <TableRow
                        key={periodo.id}
                        className={cn(
                          'h-11 hover:bg-secondary/30 transition-colors duration-150',
                          !periodo.activo && 'opacity-60'
                        )}
                      >
                        <TableCell className="py-2">
                          <div className="leading-tight">
                            <p className="font-mono text-xs font-bold text-foreground">
                              {formatCicloEscolarLabel(
                                deriveCicloEscolar({
                                  cicloEscolar: periodo.cicloEscolar,
                                  nombre: periodo.nombre,
                                  fechaInicio: periodo.fechaInicio,
                                  numeroPeriodo: periodo.numeroPeriodo,
                                })
                              )}
                            </p>
                            <span className="text-[11px] text-muted-foreground">
                              {periodo.nombre}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="secondary"
                            className="font-mono tabular-nums text-[10px] font-bold"
                          >
                            Periodo {periodo.numeroPeriodo}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 font-mono tabular-nums text-xs text-muted-foreground">
                          {periodo.fechaInicio}
                        </TableCell>
                        <TableCell className="py-2 font-mono tabular-nums text-xs text-muted-foreground">
                          {periodo.fechaFin}
                        </TableCell>
                        <TableCell className="py-2">
                          <Switch
                            checked={periodo.activo}
                            disabled={isMutating}
                            onCheckedChange={() => void togglePeriodoActivo(periodo)}
                            aria-label={`Estado del periodo ${periodo.nombre}`}
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingPeriodo(periodo)
                                setPeriodoModalOpen(true)
                              }}
                              aria-label={`Editar ${periodo.nombre}`}
                              className="h-7 w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDeleteTarget({ kind: 'periodo', item: periodo })
                              }
                              aria-label={`Eliminar ${periodo.nombre}`}
                              className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modales CRUD con key para reinicio limpio de estado */}
      <UnidadFormModal
        key={`ua-${editingUnidad?.id ?? 'new'}-${String(unidadModalOpen)}`}
        open={unidadModalOpen}
        onOpenChange={setUnidadModalOpen}
        initialData={editingUnidad}
        defaultNivel={
          effectiveNivelFilter === 'LICENCIATURA' ? 'LICENCIATURA' : 'BACHILLERATO'
        }
        onSave={handleSaveUnidad}
      />

      <ProgramaFormModal
        key={`prog-${editingPrograma?.id ?? 'new'}-${activeSelectedUnidad?.id ?? 0}-${String(programaModalOpen)}`}
        open={programaModalOpen}
        onOpenChange={setProgramaModalOpen}
        unidadPadre={activeSelectedUnidad}
        initialData={editingPrograma}
        onSave={handleSavePrograma}
      />

      <TramiteCatalogoModal
        key={`tram-${editingTramite?.id ?? 'new'}-${String(tramiteModalOpen)}`}
        open={tramiteModalOpen}
        onOpenChange={setTramiteModalOpen}
        initialData={editingTramite}
        onSave={handleSaveTramite}
      />

      <PeriodoFormModal
        key={`per-${editingPeriodo?.id ?? 'new'}-${String(periodoModalOpen)}`}
        open={periodoModalOpen}
        onOpenChange={setPeriodoModalOpen}
        initialData={editingPeriodo}
        onSave={handleSavePeriodo}
      />

      <ConfirmarEliminacionModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        tipoElemento={
          deleteTarget?.kind === 'unidad'
            ? 'Unidad Académica'
            : deleteTarget?.kind === 'programa'
              ? 'Programa Educativo'
              : deleteTarget?.kind === 'tramite'
                ? 'Tipo de Trámite'
                : 'Periodo Escolar'
        }
        nombreElemento={
          deleteTarget?.kind === 'unidad'
            ? `[${deleteTarget.item.claveUa}] ${deleteTarget.item.nombre}`
            : deleteTarget?.kind === 'programa'
              ? `[${deleteTarget.item.clavePrograma}] ${deleteTarget.item.nombre}`
              : deleteTarget?.kind === 'periodo'
                ? `${deleteTarget.item.nombre} (Periodo ${deleteTarget.item.numeroPeriodo})`
                : deleteTarget?.item.nombre ?? ''
        }
        advertenciaHistorial={
          deleteTarget
            ? 'Nota de dominio: si ya existen seguimientos o actas históricas asociadas (ON DELETE RESTRICT), PostgreSQL protegerá el historial y deberás desactivar el registro con el interruptor en lugar de eliminarlo.'
            : undefined
        }
        onConfirm={() => {
          void handleConfirmDelete()
        }}
      />
    </div>
  )
}

export default CatalogosView
